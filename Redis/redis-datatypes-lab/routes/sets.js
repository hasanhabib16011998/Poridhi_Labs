const express = require('express');
const router = express.Router();
const redis = require('../redis');

// Create article with tags
router.post('/articles', async (req, res) => {
  try {
    const { id, title, content, tags } = req.body;

    if (!id || !title || !tags || !Array.isArray(tags)) {
      return res.status(400).json({ 
        error: 'id, title, and tags array required' 
      });
    }

    const article = {
      id,
      title,
      content: content || '',
      createdAt: new Date().toISOString()
    };

    // Store article data
    await redis.set(`article:${id}`, JSON.stringify(article));

    // Store article ID in each tag's set
    for (const tag of tags) {
      await redis.sadd(`tag:${tag}:articles`, id);
    }

    // Store tags for this article
    await redis.sadd(`article:${id}:tags`, ...tags);

    res.status(201).json({
      message: 'Article created',
      article,
      tags
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get articles by tag
router.get('/tags/:tag/articles', async (req, res) => {
  try {
    const tag = req.params.tag;
    const tagKey = `tag:${tag}:articles`;

    // Get all article IDs with this tag
    const articleIds = await redis.smembers(tagKey);

    if (articleIds.length === 0) {
      return res.json({
        tag,
        articles: [],
        count: 0
      });
    }

    // Fetch article data for each ID
    const articles = await Promise.all(
      articleIds.map(async (id) => {
        const data = await redis.get(`article:${id}`);
        const tags = await redis.smembers(`article:${id}:tags`);
        return {
          ...JSON.parse(data),
          tags
        };
      })
    );

    res.json({
      tag,
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get article with its tags
router.get('/articles/:id', async (req, res) => {
  try {
    const articleId = req.params.id;
    const articleKey = `article:${articleId}`;

    const articleData = await redis.get(articleKey);

    if (!articleData) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const tags = await redis.smembers(`article:${articleId}:tags`);

    res.json({
      article: JSON.parse(articleData),
      tags
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find articles with ALL specified tags (intersection)
router.post('/articles/search/all', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'tags array required' });
    }

    // Get intersection of all tag sets
    const tagKeys = tags.map(tag => `tag:${tag}:articles`);
    const articleIds = await redis.sinter(...tagKeys);

    if (articleIds.length === 0) {
      return res.json({
        searchTags: tags,
        articles: [],
        count: 0
      });
    }

    const articles = await Promise.all(
      articleIds.map(async (id) => {
        const data = await redis.get(`article:${id}`);
        const articleTags = await redis.smembers(`article:${id}:tags`);
        return {
          ...JSON.parse(data),
          tags: articleTags
        };
      })
    );

    res.json({
      searchTags: tags,
      matchType: 'all',
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Find articles with ANY specified tags (union)
router.post('/articles/search/any', async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'tags array required' });
    }

    // Get union of all tag sets
    const tagKeys = tags.map(tag => `tag:${tag}:articles`);
    const articleIds = await redis.sunion(...tagKeys);

    if (articleIds.length === 0) {
      return res.json({
        searchTags: tags,
        articles: [],
        count: 0
      });
    }

    const articles = await Promise.all(
      articleIds.map(async (id) => {
        const data = await redis.get(`article:${id}`);
        const articleTags = await redis.smembers(`article:${id}:tags`);
        return {
          ...JSON.parse(data),
          tags: articleTags
        };
      })
    );

    res.json({
      searchTags: tags,
      matchType: 'any',
      articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add user to followers set
router.post('/users/:userId/followers/:followerId', async (req, res) => {
  try {
    const { userId, followerId } = req.params;
    const followersKey = `user:${userId}:followers`;
    const followingKey = `user:${followerId}:following`;

    // Add to both sets
    await redis.sadd(followersKey, followerId);
    await redis.sadd(followingKey, userId);

    const followerCount = await redis.scard(followersKey);

    res.json({
      message: 'Follower added',
      userId,
      followerId,
      followerCount
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mutual followers
router.get('/users/:userId1/mutual/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    const followers1Key = `user:${userId1}:followers`;
    const followers2Key = `user:${userId2}:followers`;

    // Get intersection (mutual followers)
    const mutualFollowers = await redis.sinter(followers1Key, followers2Key);

    res.json({
      user1: userId1,
      user2: userId2,
      mutualFollowers,
      count: mutualFollowers.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user is follower
router.get('/users/:userId/followers/:followerId/check', async (req, res) => {
  try {
    const { userId, followerId } = req.params;
    const followersKey = `user:${userId}:followers`;

    const isFollower = await redis.sismember(followersKey, followerId);

    res.json({
      userId,
      followerId,
      isFollower: isFollower === 1
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

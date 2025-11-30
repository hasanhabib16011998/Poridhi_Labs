const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());


app.use('/video.mpd', (req,res) => {
    console.log('Called mpd')
    const filepath = path.join(__dirname, 'video', 'video.mpd');
    res.sendFile(filepath);
})
//Serve the DASH segment files
app.get('/video/:segment', (req,res) => {
    console.log('Called segment')
    const segment = req.params.segment;
    const filepath = path.join(__dirname, 'video', segment);
    res.sendFile(filepath) 
})


app.listen(port, () => {
    console.log(`Server is running at port ${port}`)
})

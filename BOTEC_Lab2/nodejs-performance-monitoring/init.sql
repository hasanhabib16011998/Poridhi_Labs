-- Initialize the database schema
CREATE TABLE IF NOT EXISTS user_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_data_created_at ON user_data(created_at);
CREATE INDEX IF NOT EXISTS idx_user_data_email ON user_data(email);

-- Insert some sample data
INSERT INTO user_data (name, email, message) VALUES
('John Doe', 'john@example.com', 'Welcome to our monitoring demo!'),
('Jane Smith', 'jane@example.com', 'Testing the PostgreSQL connection'),
('DevOps Engineer', 'devops@company.com', 'Setting up monitoring and observability');

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON TABLE user_data TO appuser;
GRANT USAGE, SELECT ON SEQUENCE user_data_id_seq TO appuser;
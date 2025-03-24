# Football Transfer Management System

## Project Overview
The Football Transfer Management System is a comprehensive solution for tracking, managing, and analyzing football player transfers between clubs. This system leverages distributed and non-relational database technologies to handle data consistency challenges in the face of frequent transfers and changes in player values.

## Features

### Player Management
- Detailed player profiles with personal information, statistics, and history
- Current and historical market value tracking
- Performance metrics monitoring

### Transfer Management
- Comprehensive transfer records
- Transfer fee tracking and analysis
- Historical transfer data by player and club

### Club Management
- Club profiles and details
- Squad management
- Transfer budget tracking

### Agent Management
- Agent profiles and details
- Client lists
- Transfer involvement history

### Contract Management
- Current contract details
- Contract history
- Salary information

### Analysis Features
- Market value analysis with historical trends
- Value predictions and market comparisons
- Transfer pattern analysis including seasonal trends
- Club spending patterns and league-wise analysis

## Technologies Used

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework for Node.js
- **Mongoose ODM**: Object Data Modeling library for MongoDB

### Database
- **MongoDB**: Primary NoSQL database for flexible schema and scalability
- **MongoDB Compass**: GUI tool for MongoDB visualization and management

### Frontend
- **React.js**: JavaScript library for building user interfaces
- **Material-UI**: React UI framework for responsive design

### Development Tools
- **VS Code**: Code editor
- **Git**: Version control system
- **Postman**: API testing tool

## System Architecture
- Microservices-based architecture
- RESTful API endpoints
- Node.js backend
- React frontend
- MongoDB database

## Data Model

### Collections Structure:
1. **players**
   - _id
   - name
   - birthDate
   - nationality
   - position
   - currentClub
   - marketValue
   - stats

2. **transfers**
   - _id
   - playerId
   - fromClub
   - toClub
   - transferFee
   - date
   - agentId
   - contractDetails

3. **clubs**
   - _id
   - name
   - league
   - country
   - budget
   - currentSquad

4. **agents**
   - _id
   - name
   - clientList
   - transferHistory

5. **contracts**
   - _id
   - playerId
   - clubId
   - startDate
   - endDate
   - salary
   - clauses

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm (v6 or higher)

### Installation
1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/football-transfer-system.git
   cd football-transfer-system
   ```

2. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies
   ```bash
   cd ../frontend
   npm install
   ```

4. Set up environment variables
   - Create a `.env` file in the backend directory
   - Add the following variables:
     ```
     MONGODB_URI=mongodb://localhost:27017/football-transfer-db
     PORT=3000
     JWT_SECRET=your_jwt_secret
     ```

5. Start MongoDB service
   ```bash
   sudo service mongod start  # Linux
   # or
   mongod  # Windows
   ```

6. Run the application
   - Start backend:
     ```bash
     cd backend
     npm start
     ```
   - Start frontend in a new terminal:
     ```bash
     cd frontend
     npm start
     ```

7. Access the application at `http://localhost:3000`

## Project Structure
```
football-transfer-system/
├── backend/
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── models/              # MongoDB schema models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   ├── app.js               # Express app setup
│   └── server.js            # Server entry point
├── frontend/
│   ├── public/              # Static files
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   ├── App.js           # Main App component
│   │   └── index.js         # React entry point
│   └── package.json         # Frontend dependencies
├── SPECS.md                 # Detailed project specifications
├── README.md                # Project documentation
└── package.json             # Project dependencies
```

## Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -m 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contact
For questions or support, please contact [your-email@example.com](mailto:your-email@example.com)


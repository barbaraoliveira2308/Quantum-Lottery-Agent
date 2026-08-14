## Stack do projeto

### Backend
- Python
- Flask
- Qiskit

### Frontend
- React
- JavaScript
- Vite

## Estrutura

- `backend/`: API, regras de negócio e processamento quântico
- `frontend/`: interface web em React

# Quantum Lottery Agent

Quantum computing-based lottery prediction system for Euromillions.

## About

This project uses quantum circuits (Qiskit) to analyze historical drawing patterns and generate probabilistic predictions. Through quantum superposition and entanglement, the system weights historical frequencies, recent trends, and day-of-week patterns.

## Features

- Quantum Predictions: Generates number and star combinations using quantum circuits
- Statistical Analysis: Historical frequencies, hot/cold numbers, and trends
- Temporal Filtering: Separates analysis by day of week (Tuesday vs Friday)
- Qubit Probability: Shows p(0) and p(1) for each circuit qubit
- REST API: Flask backend with CORS for frontend integration
- Quantum Simulation: Qiskit Aer Simulator for circuit execution

## Technologies

- Backend: Python, Flask, Flask-CORS
- Quantum: Qiskit, Qiskit Aer
- Frontend: React, Material-UI, Axios
- Data: Pandas, NumPy

## How to Run

### Backend
```bash
cd backend
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- POST /api/predict - Generates quantum predictions
- GET /api/analysis - Returns statistical analysis of dataset
- POST /api/upload - Loads CSV file with drawing history

## Prediction Format

```json
{
  "predictions": [
    {
      "numbers": [3, 12, 25, 33, 47],
      "stars": [4, 9],
      "quantum_qubits": [
        {"p0": 0.85, "p1": 0.15},
        {"p0": 0.72, "p1": 0.28}
      ],
      "weekday": "tuesday"
    }
  ]
}
```

## Quantum Model

The system uses:
- 6 qubits for numbers (1-50)
- 4 qubits for stars (1-12)
- Ry rotations weighted by historical probabilities
- CNOT entanglement to correlate qubits
- 1024 shots to extract probability distribution

## License

MIT

Disclaimer: This project is for educational and entertainment purposes only. Does not guarantee winnings in real lotteries.

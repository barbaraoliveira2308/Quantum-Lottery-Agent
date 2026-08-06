from datetime import datetime
import pandas as pd
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from flask import Blueprint, request, jsonify

api = Blueprint('api', __name__)

# DataFrame global carregado em algum lugar (por upload ou no app)
df = None

# ajuste se o nome da coluna de data for outro
# para o CSV do Kaggle normalmente é algo como "date" ou "DrawDate"
DATE_COL = 'date'  # depois vamos conferir no df.columns
  

def calculate_quantum_prediction(data: pd.DataFrame, num_predictions: int = 2, target_weekday: str = None):
    """
    Simula uma máquina de sorteio quântica com:
    - Peso temporal (recente vs histórico)
    - Filtro por dia da semana
    - Números quentes/frios
    - Entrelaçamento quântico
    """
    global DATE_COL
    
    
    # 1) Preparar dados
    df = data.copy()
    if DATE_COL not in df.columns:
        DATE_COL = df.columns[0]
    
    df[DATE_COL] = pd.to_datetime(df[DATE_COL], dayfirst=True, errors='coerce')
    df = df.dropna(subset=[DATE_COL])
    df = df.sort_values(by=DATE_COL)
    
    # 2) Filtrar por dia da semana (se especificado)
    if target_weekday == 'tuesday':
        subset = df[df[DATE_COL].dt.weekday == 1].tail(150)
    elif target_weekday == 'friday':
        subset = df[df[DATE_COL].dt.weekday == 4].tail(150)
    else:
        subset = df.tail(150)
    
    if len(subset) < 20:
        subset = df.tail(150)
    
    # 3) Frequências
    number_freq = pd.Series(np.zeros(50), index=range(1, 51))
    star_freq = pd.Series(np.zeros(12), index=range(1, 13))
    
    for col in ['num_1', 'num_2', 'num_3', 'num_4', 'num_5']:
        if col in subset.columns:
            vals = subset[col].dropna().astype(int)
            vals = vals[(vals >= 1) & (vals <= 50)]
            number_freq[vals] += 1
    
    for col in ['star_1', 'star_2']:
        if col in subset.columns:
            vals = subset[col].dropna().astype(int)
            vals = vals[(vals >= 1) & (vals <= 12)]
            star_freq[vals] += 1
    
    # 4) Probabilidades
    if number_freq.sum() > 0:
        number_probs = number_freq / number_freq.sum()
    else:
        number_probs = pd.Series(np.ones(50) / 50, index=range(1, 51))
    
    if star_freq.sum() > 0:
        star_probs = star_freq / star_freq.sum()
    else:
        star_probs = pd.Series(np.ones(12) / 12, index=range(1, 13))
    
    # 5) Circuito quântico aprimorado
    predictions = []
    
    for _ in range(num_predictions):
        # === Números ===
        qc_num = QuantumCircuit(6, 6)
        
        # Superposição ponderada
        for q in range(6):
            p1 = float(number_probs.iloc[q % len(number_probs)])
            p1 = max(0.0, min(1.0, p1))
            angle = 2 * np.arcsin(np.sqrt(p1))
            qc_num.ry(angle, q)
        
        # Entrelaçamento (simula correlação entre bolas)
        qc_num.cx(0, 1)
        qc_num.cx(2, 3)
        qc_num.cx(4, 5)
        
        qc_num.measure_all()
        
        backend = AerSimulator()
        t_circ = transpile(qc_num, backend)
        result = backend.run(t_circ, shots=1024).result()
        counts = result.get_counts()
        
        # Extrair distribuição p(0)/p(1) por qubit
        bitstrings = list(counts.keys())
        total_shots = sum(counts.values())
        qubit_probs = []
        
        for q in range(6):
            ones = sum(counts[b] for b in bitstrings if b[::-1][q] == '1')
            p1_q = ones / total_shots if total_shots > 0 else 0.5
            qubit_probs.append({"p0": 1 - p1_q, "p1": p1_q})
        
        # === Seleção final de números ===
        # Mistura: hot (50%) + cold (30%) + aleatório (20%)
        hot_numbers = number_freq.nlargest(15).index.tolist()
        cold_numbers = number_freq.nsmallest(10).index.tolist()
        
        selected = []
        
        # 2 números quentes
        if len(hot_numbers) >= 2:
            selected.extend(np.random.choice(hot_numbers, size=2, replace=False))
        
        # 1 número frio
        available_cold = [n for n in cold_numbers if n not in selected]
        if available_cold:
            selected.append(np.random.choice(available_cold))
        
        # 2 números ponderados pela probabilidade quântica
        while len(selected) < 5:
            available = [n for n in range(1, 51) if n not in selected]
            probs = number_probs.loc[available].values
            probs = probs / probs.sum()
            selected.append(np.random.choice(available, p=probs))
        
        # === Estrelas ===
        if star_freq.sum() > 0:
            stars = np.random.choice(star_freq[star_freq > 0].index, size=2, replace=False)
        else:
            stars = np.random.choice(range(1, 13), size=2, replace=False)
        
        predictions.append({
            "numbers": sorted(int(n) for n in selected),
            "stars": sorted(int(s) for s in stars),
            "quantum_qubits": qubit_probs,
            "weekday": target_weekday,
        })
    
    return predictions

@api.route('/predict', methods=['POST'])
def predict():
    global df
    if df is None:
        return jsonify({"error": "Carregue um ficheiro CSV primeiro"}), 400

    data = request.json or {}
    num_predictions = data.get('num_predictions', 2)  # padrão: 2 (terça e sexta)

    try:
        predictions, analysis = calculate_quantum_prediction(df, num_predictions)
        return jsonify({"predictions": predictions, "analysis": analysis}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro na previsão: {str(e)}"}), 500
    
@api.route('/analysis', methods=['GET'])
def get_analysis():
    global df
    if df is None:
        return jsonify({"error": "Carregue um ficheiro CSV primeiro"}), 400

    number_freq = pd.Series(np.zeros(50), index=range(1, 51))
    star_freq = pd.Series(np.zeros(12), index=range(1, 13))

    for col in ['num_1', 'num_2', 'num_3', 'num_4', 'num_5']:
        if col in df.columns:
            vals = df[col].dropna().astype(int)
            vals = vals[(vals >= 1) & (vals <= 50)]
            number_freq[vals] += 1

    for col in ['star_1', 'star_2']:
        if col in df.columns:
            vals = df[col].dropna().astype(int)
            vals = vals[(vals >= 1) & (vals <= 12)]
            star_freq[vals] += 1

    # Estatísticas
    number_mean = number_freq[number_freq > 0].mean()
    number_std = number_freq[number_freq > 0].std()
    
    threshold_hot = number_mean + 0.5 * number_std
    threshold_cold = number_mean - 0.5 * number_std
    
    hot_numbers = number_freq[number_freq > threshold_hot].index.tolist()
    cold_numbers = number_freq[(number_freq < threshold_cold) & (number_freq > 0)].index.tolist()

    # Últimos 50 sorteios
    recent_50 = df.tail(50)
    recent_freq = pd.Series(np.zeros(50), index=range(1, 51))
    for col in ['num_1', 'num_2', 'num_3', 'num_4', 'num_5']:
        if col in recent_50.columns:
            vals = recent_50[col].dropna().astype(int)
            vals = vals[(vals >= 1) & (vals <= 50)]
            recent_freq[vals] += 1
    
    trending = recent_freq.nlargest(10).index.tolist()

    analysis = {
        "total_draws": len(df),
        "last_draw_date": df.iloc[-1]['date'] if 'date' in df.columns else 'N/A',
        "number_frequencies": {int(k): int(v) for k, v in number_freq[number_freq > 0].to_dict().items()},
        "star_frequencies": {int(k): int(v) for k, v in star_freq[star_freq > 0].to_dict().items()},
        "hot_numbers": hot_numbers,
        "hot_stars": star_freq.nlargest(2).index.tolist(),
        "cold_numbers": cold_numbers,
        "cold_stars": star_freq.nsmallest(2).index.tolist(),
        "trending_numbers": trending,
        "most_frequent_numbers": {int(k): int(v) for k, v in number_freq.nlargest(10).to_dict().items()},
        "most_frequent_stars": {int(k): int(v) for k, v in star_freq.nlargest(5).to_dict().items()},
        "number_mean": float(number_mean),
        "number_std": float(number_std),
    }

    return jsonify(analysis), 200
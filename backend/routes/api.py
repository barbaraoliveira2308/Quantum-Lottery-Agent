from datetime import datetime
import pandas as pd
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator
from flask import Blueprint, request, jsonify
from collections import Counter
import itertools
from .quantum_experimental import run_quantum_experimental
from .simulation_engine import build_simulation_report


api = Blueprint('api', __name__)

# DataFrame global carregado via upload ou no app.py
df = None

# ajuste se o nome da coluna de data for outro
DATE_COL = 'date'


def analyze_historical_sequences(data):
    """
    FASE 1: Analisa todas as sequências históricas
    - Frequência individual de cada número
    - Pares/trios que mais saem juntos
    - Separação por dia da semana
    """
    global DATE_COL 
    df_tmp = data.copy()
    
    if DATE_COL not in df_tmp.columns:
        DATE_COL = df_tmp.columns[0]
    
    df_tmp[DATE_COL] = pd.to_datetime(df_tmp[DATE_COL], dayfirst=True, errors='coerce')
    df_tmp = df_tmp.dropna(subset=[DATE_COL])
    df_tmp = df_tmp.sort_values(by=DATE_COL)
    
    # Análise geral
    number_freq = Counter()
    star_freq = Counter()
    pairs_freq = Counter()
    triples_freq = Counter()
    
    # Análise por dia da semana
    tuesday_numbers = Counter()
    friday_numbers = Counter()
    tuesday_stars = Counter()
    friday_stars = Counter()
    
    for idx, row in df_tmp.iterrows():
        weekday = row[DATE_COL].weekday()
        
        # Extrair números do sorteio
        numbers = []
        for col in ['num_1', 'num_2', 'num_3', 'num_4', 'num_5']:
            if col in row and pd.notna(row[col]):
                num = int(row[col])
                if 1 <= num <= 50:
                    numbers.append(num)
                    number_freq[num] += 1
                    
                    if weekday == 1:  # terça
                        tuesday_numbers[num] += 1
                    elif weekday == 4:  # sexta
                        friday_numbers[num] += 1
        
        # Pares que saem juntos
        for pair in itertools.combinations(sorted(numbers), 2):
            pairs_freq[pair] += 1
        
        # Trios que saem juntos
        for triple in itertools.combinations(sorted(numbers), 3):
            triples_freq[triple] += 1
        
        # Estrelas
        for col in ['star_1', 'star_2']:
            if col in row and pd.notna(row[col]):
                star = int(row[col])
                if 1 <= star <= 12:
                    star_freq[star] += 1
                    if weekday == 1:
                        tuesday_stars[star] += 1
                    elif weekday == 4:
                        friday_stars[star] += 1
    
    return {
        'number_freq': number_freq,
        'star_freq': star_freq,
        'pairs_freq': pairs_freq,
        'triples_freq': triples_freq,
        'tuesday_numbers': tuesday_numbers,
        'friday_numbers': friday_numbers,
        'tuesday_stars': tuesday_stars,
        'friday_stars': friday_stars,
        'total_draws': len(df_tmp),
    }


def calculate_quantum_prediction(data: pd.DataFrame, num_predictions: int = 2):
    """
    FASE 2-5: 
    - Superposição quântica de todas as possibilidades
    - Refinamento estatístico multi-camada
    - Gera 2 previsões (terça e sexta)
    """
    
    global DATE_COL
    
    # FASE 1: Análise histórica
    analysis = analyze_historical_sequences(data)
    
    # Preparar dados temporais
    df_tmp = data.copy()
    if DATE_COL not in df_tmp.columns:
        DATE_COL = df_tmp.columns[0]
    
    df_tmp[DATE_COL] = pd.to_datetime(df_tmp[DATE_COL], dayfirst=True, errors='coerce')
    df_tmp = df_tmp.dropna(subset=[DATE_COL])
    df_tmp = df_tmp.sort_values(by=DATE_COL)
    
    predictions = []
    per_prediction_analysis = []
    
    # Limita a 2 previsões (terça e sexta)
    num_predictions = min(num_predictions, 2)
    
    for idx in range(num_predictions):
        # Seleciona dia da semana
        if idx == 0:
            weekday = 1   # terça
            label = 'tuesday'
            number_freq = analysis['tuesday_numbers']
            star_freq = analysis['tuesday_stars']
        else:
            weekday = 4   # sexta
            label = 'friday'
            number_freq = analysis['friday_numbers']
            star_freq = analysis['friday_stars']
        
        # Filtro temporal: últimos 150 sorteios desse dia
        subset = df_tmp[df_tmp[DATE_COL].dt.weekday == weekday].tail(150)
        if len(subset) < 20:
            subset = df_tmp.tail(150)
        
        # FASE 2: Construir probabilidades compostas
        
        # 2a) Frequência histórica normalizada
        total_nums = sum(number_freq.values()) if number_freq else 1
        total_stars = sum(star_freq.values()) if star_freq else 1
        
        # 2b) Frequência recente (últimos 50 sorteios)
        recent_freq = Counter()
        for col in ['num_1', 'num_2', 'num_3', 'num_4', 'num_5']:
            if col in subset.columns:
                vals = subset[col].dropna().astype(int)
                vals = vals[(vals >= 1) & (vals <= 50)]
                recent_freq.update(vals)
        
        recent_total = sum(recent_freq.values()) if recent_freq else 1
        
        # 2c) Probabilidade composta (histórica + recente + uniforme)
        # Fórmula: p_composite = 0.4 * p_historical + 0.4 * p_recent + 0.2 * p_uniform
        number_probs = {}
        for num in range(1, 51):
            p_historical = number_freq.get(num, 0) / total_nums if total_nums > 0 else 0
            p_recent = recent_freq.get(num, 0) / recent_total if recent_total > 0 else 0
            p_uniform = 1 / 50
            
            # Combinação ponderada
            p_composite = 0.4 * p_historical + 0.4 * p_recent + 0.2 * p_uniform
            number_probs[num] = p_composite
        
        # Normalizar para soma = 1
        total_prob = sum(number_probs.values())
        if total_prob > 0:
            number_probs = {k: v / total_prob for k, v in number_probs.items()}
        
        # Estrelas
        star_probs = {}
        for star in range(1, 13):
            p_historical = star_freq.get(star, 0) / total_stars if total_stars > 0 else 0
            p_uniform = 1 / 12
            p_composite = 0.6 * p_historical + 0.4 * p_uniform
            star_probs[star] = p_composite
        
        total_star_prob = sum(star_probs.values())
        if total_star_prob > 0:
            star_probs = {k: v / total_star_prob for k, v in star_probs.items()}
        
        # FASE 3: Circuito Quântico Multi-Camada
        
        # 3a) Preparar vetor de probabilidades para 50 números
        prob_vector = np.array([number_probs.get(i, 0) for i in range(1, 51)])
        
        # 3b) Criar circuito quântico para números (6 qubits = 64 estados possíveis)
        qc_num = QuantumCircuit(6, 6)
        
        # Superposição ponderada: cada qubit representa amplitude de probabilidade
        for q in range(6):
            # Mapear probabilidade para ângulo de rotação
            p_target = prob_vector[q % len(prob_vector)]
            p_target = max(0.0, min(1.0, p_target * 10))  # Amplificar para melhor resolução
            
            # Ângulo Ry: mapeia probabilidade para esfera de Bloch
            angle = 2 * np.arcsin(np.sqrt(min(p_target, 1.0)))
            qc_num.ry(angle, q)
        
        # Entrelaçamento: correlaciona qubits adjacentes (simula dependência entre números)
        qc_num.cx(0, 1)
        qc_num.cx(2, 3)
        qc_num.cx(4, 5)
        qc_num.cx(1, 2)
        qc_num.cx(3, 4)
        
        # Hadamard em alguns qubits para criar interferência quântica
        qc_num.h(0)
        qc_num.h(3)
        
        qc_num.measure_all()
        
        # 3c) Executar circuito (1024 shots = 1024 medições simultâneas)
        backend = AerSimulator()
        t_circ = transpile(qc_num, backend)
        result = backend.run(t_circ, shots=1024).result()
        counts = result.get_counts()
        
        # FASE 4: Análise das Medições Quânticas
        
        # 4a) Extrair distribuição p(0)/p(1) por qubit
        bitstrings = list(counts.keys())
        total_shots = sum(counts.values())
        qubit_probs = []
        
        for q in range(6):
            ones = sum(counts[b] for b in bitstrings if b[::-1][q] == '1')
            p1_q = ones / total_shots if total_shots > 0 else 0.5
            qubit_probs.append({"p0": 1 - p1_q, "p1": p1_q})
        
        # 4b) Selecionar números baseado em:
        # - Top 10 pares mais frequentes (da análise histórica)
        # - Top 20 números mais frequentes
        # - Amostragem ponderada pela probabilidade quântica
        
        top_pairs = analysis['pairs_freq'].most_common(15)
        top_numbers = sorted(number_freq.items(), key=lambda x: x[1], reverse=True)[:20]
        
        # Construir pool de números candidatos
        candidate_pool = []
        
        # Adicionar números dos pares mais frequentes
        for pair, _ in top_pairs:
            candidate_pool.extend(pair)
        
        # Adicionar números mais frequentes
        for num, _ in top_numbers:
            candidate_pool.append(num)
        
        # Remover duplicatas e limitar a 30 candidatos
        candidate_pool = list(set(candidate_pool))[:30]
        
        # Se pool for pequeno, completar com números aleatórios ponderados
        while len(candidate_pool) < 30:
            available = [n for n in range(1, 51) if n not in candidate_pool]
            if available:
                candidate_pool.append(np.random.choice(available))
            else:
                break
        
        # FASE 5: Geração da Combinação Final
        
        # 5a) Selecionar 2 números dos pares mais frequentes
        selected = []
        if top_pairs:
            # Escolher um par aleatório do top 10
            pair = top_pairs[np.random.randint(0, min(10, len(top_pairs)))][0]
            selected.extend(pair)
        
        # 5b) Selecionar 2 números dos TOP 10 MAIS QUENTES (que mais saem)
        hot_numbers = sorted(number_freq.items(), key=lambda x: x[1], reverse=True)[:10]
        hot_pool = [n[0] for n in hot_numbers if n[0] not in selected]
        
        if len(hot_pool) >= 2:
            # Escolher 2 números quentes que ainda não estão selecionados
            selected.extend(np.random.choice(hot_pool, size=min(2, len(hot_pool)), replace=False).tolist())
        elif len(hot_pool) == 1:
            # Se só tiver 1 número quente disponível, usa ele
            selected.append(hot_pool[0])
        
        # 5c) Completar com 1 número da amostragem ponderada pela probabilidade composta
        while len(selected) < 5:
            available = [n for n in candidate_pool if n not in selected]
            if not available:
                available = [n for n in range(1, 51) if n not in selected]
            
            if available:
                # Ponderar pela probabilidade composta
                probs = np.array([number_probs.get(n, 0.02) for n in available])
                probs = probs / probs.sum()
                selected.append(np.random.choice(available, p=probs))
            else:
                break
        
        # 5d) Estrelas: mesma lógica (top 6 mais frequentes)
        star_candidates = sorted(star_freq.items(), key=lambda x: x[1], reverse=True)[:6]
        if star_candidates:
            # Extrai só os números das estrelas (não as tuplas completas)
            star_pool = [s[0] for s in star_candidates]
            stars = np.random.choice(
                star_pool, 
                size=min(2, len(star_pool)), 
                replace=False
            ).tolist()
        else:
            stars = np.random.choice(range(1, 13), size=2, replace=False).tolist()
        
        # Garantir que stars tem exatamente 2 elementos
        while len(stars) < 2:
            available_star = np.random.choice(range(1, 13))
            if available_star not in stars:
                stars.append(int(available_star))
        
        predictions.append({
            "numbers": sorted(int(n) for n in selected[:5]),
            "stars": sorted(int(s) for s in stars[:2]),
            "quantum_qubits": qubit_probs,
            "weekday": label,
        })
        
        per_prediction_analysis.append({
            "weekday": label,
            "total_draws_used": int(len(subset)),
            "number_frequencies": dict(number_freq.most_common(20)),
            "star_frequencies": dict(star_freq.most_common(8)),
            "top_pairs": [f"{p[0][0]}-{p[0][1]}" for p in top_pairs[:5]],
        })
    
    analysis_output = {
        "per_prediction": per_prediction_analysis,
        "global_analysis": {
            "total_draws": analysis['total_draws'],
            "most_frequent_numbers": dict(analysis['number_freq'].most_common(10)),
            "most_frequent_stars": dict(analysis['star_freq'].most_common(5)),
        }
    }
    
    return predictions, analysis_output


@api.route('/upload', methods=['POST'])
def upload_file():
    global df
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum ficheiro enviado"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Nome de ficheiro vazio"}), 400

    df = pd.read_csv(file)

    return jsonify({"message": "CSV carregado com sucesso", "rows": len(df)}), 200


@api.route('/predict', methods=['POST'])
def predict():
    global df
    if df is None:
        return jsonify({"error": "Carregue um ficheiro CSV primeiro"}), 400

    data = request.json or {}
    num_predictions = data.get('num_predictions', 2)

    try:
        preds, analysis = calculate_quantum_prediction(df, num_predictions)
        
        # Garante que preds seja uma lista
        if not isinstance(preds, list):
            preds = [preds]
        
        return jsonify({"predictions": preds, "analysis": analysis}), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro na previsão: {str(e)}"}), 500


@api.route('/analysis', methods=['GET'])
def get_analysis():
    global df
    if df is None:
        return jsonify({"error": "Carregue um ficheiro CSV primeiro"}), 400

    # Análise histórica completa
    analysis = analyze_historical_sequences(df)
    
    result = {
        "total_draws": analysis['total_draws'],
        "number_frequencies": dict(analysis['number_freq'].most_common(50)),
        "star_frequencies": dict(analysis['star_freq'].most_common(12)),
        "most_frequent_pairs": [
            {"pair": f"{p[0][0]}-{p[0][1]}", "count": p[1]} 
            for p in analysis['pairs_freq'].most_common(20)
        ],
        "most_frequent_triples": [
            {"triple": f"{t[0][0]}-{t[0][1]}-{t[0][2]}", "count": t[1]} 
            for t in analysis['triples_freq'].most_common(10)
        ],
        "tuesday_analysis": {
            "numbers": dict(analysis['tuesday_numbers'].most_common(20)),
            "stars": dict(analysis['tuesday_stars'].most_common(8)),
        },
        "friday_analysis": {
            "numbers": dict(analysis['friday_numbers'].most_common(20)),
            "stars": dict(analysis['friday_stars'].most_common(8)),
        },
    }

    return jsonify(result), 200

@api.route('/simulate', methods=['POST'])
def simulate():
    global df

    if df is None or df.empty:
        return jsonify({
            'error': 'Carregue um ficheiro CSV primeiro'
        }), 400

    try:
        payload = request.get_json(silent=True) or {}

        num_simulations = int(
            payload.get('num_simulations', 10000)
        )

        top_k = int(
            payload.get('top_k', 20)
        )

        test_draws = int(
            payload.get('test_draws', 20)
        )

        simulations_per_draw = int(
            payload.get('simulations_per_draw', 2000)
        )

        report = build_simulation_report(
            data=df,
            num_simulations=num_simulations,
            top_k=top_k,
            test_draws=test_draws,
            simulations_per_draw=simulations_per_draw,
            date_col=DATE_COL,
        )

        return jsonify(report), 200

    except ValueError as error:
        return jsonify({
            'error': f'Parâmetro inválido: {str(error)}'
        }), 400

    except Exception as error:
        import traceback

        traceback.print_exc()

        return jsonify({
            'error': f'Erro na simulação: {str(error)}'
        }), 500
        
@api.route(
    '/quantum-experimental',
    methods=['POST']
)
def quantum_experimental():
    global df

    if df is None or df.empty:
        return jsonify({
            'error': (
                'Carregue um ficheiro CSV '
                'primeiro.'
            )
        }), 400

    try:
        payload = request.get_json(
            silent=True
        ) or {}

        top_k = int(
            payload.get('top_k', 20)
        )

        quantum_shots = int(
            payload.get('quantum_shots', 10000)
        )

        candidate_count = int(
            payload.get('candidate_count', 5000)
        )

        random_seed = payload.get(
            'random_seed',
            None,
        )

        weekday = payload.get(
            'weekday',
            'friday',
        )

        if weekday not in [
            'tuesday',
            'friday',
        ]:
            weekday = 'friday'

        result = run_quantum_experimental(
            data=df,
            top_k=top_k,
            quantum_shots=quantum_shots,
            candidate_count=candidate_count,
            random_seed=random_seed,
            date_col=DATE_COL,
            weekday=weekday,
        )

        return jsonify(result), 200

    except ValueError as error:
        return jsonify({
            'error': f'Parâmetro inválido: {str(error)}'
        }), 400

    except Exception as error:
        import traceback

        traceback.print_exc()

        return jsonify({
            'error': (
                'Erro no modo quântico experimental: '
                f'{str(error)}'
            )
        }), 500
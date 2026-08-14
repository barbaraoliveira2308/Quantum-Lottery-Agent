from itertools import combinations

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

from .simulation_engine import (
    _combination_score,
    backtest_model,
    build_feature_model,
    calculate_number_scores,
    calculate_star_scores,
)
def _run_uniform_quantum_sampler(
    num_qubits,
    shots,
    seed=None,
):
    """
    Executa um circuito uniforme com Hadamard.

    Cada estado medido representa um número inteiro.
    """
    circuit = QuantumCircuit(num_qubits)

    for qubit in range(num_qubits):
        circuit.h(qubit)

    circuit.measure_all()

    backend = AerSimulator(
        seed_simulator=seed
    )

    compiled_circuit = transpile(
        circuit,
        backend,
    )

    result = backend.run(
        compiled_circuit,
        shots=shots,
    ).result()

    return result.get_counts()


def _counts_to_values(
    counts,
    minimum,
    maximum,
    amount,
    rng,
):
    """
    Converte os estados medidos em valores válidos.

    Estados fora do intervalo são rejeitados.
    """
    states = []
    state_weights = []

    for bitstring, count in counts.items():
        value = int(bitstring, 2)

        if minimum <= value <= maximum:
            states.append(value)
            state_weights.append(count)

    if not states:
        return []

    probabilities = np.asarray(
        state_weights,
        dtype=float,
    )

    probabilities = probabilities / probabilities.sum()

    selected = []

    for _ in range(amount):
        index = rng.choice(
            len(states),
            p=probabilities,
        )

        selected.append(
            int(states[index])
        )

    return selected


def _build_quantum_candidates(
    number_counts,
    star_counts,
    requested_candidates,
    rng,
):
    """
    Constrói combinações de 5 números e 2 estrelas.
    """
    candidates = set()

    number_samples = _counts_to_values(
        counts=number_counts,
        minimum=0,
        maximum=49,
        amount=requested_candidates * 8,
        rng=rng,
    )

    star_samples = _counts_to_values(
        counts=star_counts,
        minimum=0,
        maximum=11,
        amount=requested_candidates * 4,
        rng=rng,
    )

    numbers = [
        value + 1
        for value in number_samples
    ]

    stars = [
        value + 1
        for value in star_samples
    ]

    if len(numbers) < 5 or len(stars) < 2:
        return []

    for number_start in range(
        0,
        len(numbers) - 4,
        5,
    ):
        number_group = numbers[
            number_start:number_start + 5
        ]

        unique_numbers = sorted(
            set(number_group)
        )

        if len(unique_numbers) != 5:
            continue

        for star_start in range(
            0,
            len(stars) - 1,
            2,
        ):
            star_group = stars[
                star_start:star_start + 2
            ]

            unique_stars = sorted(
                set(star_group)
            )

            if len(unique_stars) != 2:
                continue

            candidates.add(
                (
                    tuple(unique_numbers),
                    tuple(unique_stars),
                )
            )

            if len(candidates) >= requested_candidates:
                return list(candidates)

    return list(candidates)





def _get_model_band(relative_index):
    """
    Classifica a aderência relativa da combinação ao modelo.

    Isto não é uma probabilidade real de ganhar.
    """
    if relative_index >= 95:
        return '100-95'

    if relative_index >= 90:
        return '95-90'

    if relative_index >= 80:
        return '90-80'

    if relative_index >= 70:
        return '80-70'

    return 'Abaixo de 70'


def _score_candidate(
    numbers,
    stars,
    model,
):
    """
    Calcula o score histórico de uma combinação.
    """
    number_scores = calculate_number_scores(model)
    star_scores = calculate_star_scores(model)

    return _combination_score(
        numbers=numbers,
        stars=stars,
        number_scores=number_scores,
        star_scores=star_scores,
        pair_frequency=model['pair_frequency'],
        triple_frequency=model['triple_frequency'],
        total_draws=model['total_draws'],
    )


def _get_weekday_model(
    full_model,
    weekday,
    date_col,
):
    """
    Cria um modelo específico para terça ou sexta.

    Terça-feira: weekday = 1
    Sexta-feira: weekday = 4
    """
    if weekday not in ['tuesday', 'friday']:
        return full_model

    weekday_number = 1 if weekday == 'tuesday' else 4

    dataframe = full_model['dataframe']

    if date_col not in dataframe.columns:
        return full_model

    weekday_data = dataframe[
        dataframe[date_col].dt.weekday == weekday_number
    ]

    # Se houver poucos sorteios do dia, usa o modelo geral.
    if len(weekday_data) < 20:
        return full_model

    return build_feature_model(
        data=weekday_data,
        date_col=date_col,
    )
    
    
def _add_frequency_based_candidates(
    candidates,
    model,
    weekday_model,
):
    """
    Adiciona combinações baseadas nos Top 10 números
    globais e nos Top 10 números do dia da semana.
    """
    global_numbers = [
        number
        for number, _ in
        model['number_frequency'].most_common(10)
    ]

    weekday_numbers = [
        number
        for number, _ in
        weekday_model[
            'number_frequency'
        ].most_common(10)
    ]

    global_stars = [
        star
        for star, _ in
        model['star_frequency'].most_common(6)
    ]

    weekday_stars = [
        star
        for star, _ in
        weekday_model[
            'star_frequency'
        ].most_common(6)
    ]

    number_pools = [
        global_numbers,
        weekday_numbers,
    ]

    star_pools = [
        global_stars,
        weekday_stars,
    ]

    for number_pool in number_pools:
        if len(number_pool) < 5:
            continue

        for number_combination in combinations(
            number_pool,
            5,
        ):
            numbers = tuple(
                sorted(number_combination)
            )

            for star_pool in star_pools:
                if len(star_pool) < 2:
                    continue

                for star_combination in combinations(
                    star_pool,
                    2,
                ):
                    stars = tuple(
                        sorted(star_combination)
                    )

                    candidates.add(
                        (numbers, stars)
                    )

    return candidates    


def run_quantum_experimental(
    data,
    top_k=20,
    quantum_shots=10000,
    candidate_count=5000,
    random_seed=None,
    date_col='date',
    weekday='friday',
    test_draws=10,
    simulations_per_draw=500,
    run_backtest=True,
):
    """
    Modo quântico experimental em duas fases:

    Fase 1:
    - gera candidatos utilizando o circuito quântico;

    Fase 2:
    - compara cada candidato com o histórico geral;
    - compara com o histórico do dia do sorteio;
    - calcula score final;
    - cria índice relativo de 100 a 90.

    Importante:
    relative_model_index não é probabilidade real.
    """
    if top_k < 1:
        top_k = 1

    if top_k > 100:
        top_k = 100

    if quantum_shots < 1000:
        quantum_shots = 1000

    if candidate_count < top_k:
        candidate_count = top_k

    if candidate_count > 100000:
        candidate_count = 100000

    rng = np.random.default_rng(random_seed)

    # Modelo histórico geral
    full_model = build_feature_model(
        data=data,
        date_col=date_col,
    )

    # Modelo específico de terça ou sexta
    weekday_model = _get_weekday_model(
        full_model=full_model,
        weekday=weekday,
        date_col=date_col,
    )

    # Circuito para os números 1 a 50
    number_counts = _run_uniform_quantum_sampler(
        num_qubits=6,
        shots=quantum_shots * 2,
        seed=random_seed,
    )

    # Circuito para as estrelas 1 a 12
    star_counts = _run_uniform_quantum_sampler(
        num_qubits=4,
        shots=quantum_shots,
        seed=random_seed,
    )

    candidates = _build_quantum_candidates(
        number_counts=number_counts,
        star_counts=star_counts,
        requested_candidates=candidate_count,
        rng=rng,
    )

    if not candidates:
        raise ValueError(
            'O circuito não gerou candidatos válidos.'
        )

    scored_candidates = []

    for numbers, stars in candidates:
        historical_score = _score_candidate(
            numbers=numbers,
            stars=stars,
            model=full_model,
        )

        weekday_score = _score_candidate(
            numbers=numbers,
            stars=stars,
            model=weekday_model,
        )

        # Dados físicos ainda não estão disponíveis.
        # Portanto, não inventamos um score físico.
        physical_score = 0.0

        # Peso do histórico geral: 45%
        # Peso do dia do sorteio: 55%
        final_score = (
            0.45 * historical_score
            + 0.55 * weekday_score
        )

        scored_candidates.append({
            'numbers': list(numbers),
            'stars': list(stars),
            'historical_score': float(
                historical_score
            ),
            'weekday_score': float(
                weekday_score
            ),
            'physical_score': float(
                physical_score
            ),
            'final_score': float(
                final_score
            ),
        })

    scored_candidates.sort(
        key=lambda item: item['final_score'],
        reverse=True,
    )

    selected_candidates = scored_candidates[:top_k]

    if not selected_candidates:
        raise ValueError(
            'Não existem candidatos classificados.'
        )

    best_score = selected_candidates[0]['final_score']

    ranked_results = []

    for rank, item in enumerate(
        selected_candidates,
        start=1,
    ):
        if best_score > 0:
            relative_index = (
                item['final_score']
                / best_score
            ) * 100
        else:
            relative_index = 0

        relative_index = round(
            max(0.0, min(100.0, relative_index)),
            4,
        )

        ranked_results.append({
            'rank': rank,
            'numbers': item['numbers'],
            'stars': item['stars'],

            'historical_score': round(
                item['historical_score'],
                8,
            ),

            'weekday_score': round(
                item['weekday_score'],
                8,
            ),

            'physical_score': round(
                item['physical_score'],
                8,
            ),

            'final_score': round(
                item['final_score'],
                8,
            ),

            'relative_model_index': relative_index,

            'model_confidence_band': (
                _get_model_band(relative_index)
            ),

            'real_probability': (
                '1 em 139.838.160'
            ),

            'probability_percent': (
                0.000000715
            ),

            'note': (
                'Índice relativo do modelo. '
                'Não representa probabilidade real '
                'de acerto.'
            ),
        })

    return {
        
        
        
        'mode': 'quantum_experimental',

        'simulation': {
            'weekday': weekday,
            'candidates_generated': len(candidates),
            'top_k': int(top_k),
            'physical_data_used': False,
            'physical_data_status': (
                'Não foram fornecidas medições físicas '
                'por bola ou por máquina.'
            ),
        },

        'quantum': {
            'number_qubits': 6,
            'star_qubits': 4,
            'number_states': 64,
            'valid_number_states': 50,
            'star_states': 16,
            'valid_star_states': 12,
            'shots_numbers': int(quantum_shots * 2),
            'shots_stars': int(quantum_shots),
            'unique_candidates': int(len(candidates)),
        },

        'model': {
            'total_draws': int(
                full_model['total_draws']
            ),
            'top_k': int(top_k),
            'candidate_count': int(
                candidate_count
            ),
            'weights': {
                'historical': 0.45,
                'weekday': 0.55,
                'physical': 0.00,
            },
        },

        # Campo principal novo
        'ranked_results': ranked_results,

        # Mantido para compatibilidade com o frontend anterior
        'ranked_combinations': ranked_results,

        'top_prediction': (
            ranked_results[0]
            if ranked_results
            else None
        ),

        'odds': {
            'jackpot': '1 em 139.838.160',
            'probability_percent': 0.000000715,
            'warning': (
                'A pontuação do modelo não altera '
                'a probabilidade matemática.'
            ),
        },
    }
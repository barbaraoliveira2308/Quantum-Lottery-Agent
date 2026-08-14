from collections import Counter
from itertools import combinations
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


NUMBER_COLUMNS = [
    'num_1',
    'num_2',
    'num_3',
    'num_4',
    'num_5',
]

STAR_COLUMNS = [
    'star_1',
    'star_2',
]


def _normalize(value, minimum=0.0, maximum=1.0):
    """
    Normaliza um valor entre minimum e maximum.
    """
    if maximum <= minimum:
        return 0.0

    result = (value - minimum) / (maximum - minimum)

    return float(max(0.0, min(1.0, result)))


def _prepare_dataframe(data: pd.DataFrame, date_col='date'):
    """
    Prepara o DataFrame sem alterar o DataFrame original.
    """
    if data is None or data.empty:
        raise ValueError('O DataFrame está vazio.')

    df = data.copy()

    if date_col not in df.columns:
        date_col = df.columns[0]

    df[date_col] = pd.to_datetime(
        df[date_col],
        dayfirst=True,
        errors='coerce',
    )

    df = df.dropna(subset=[date_col])
    df = df.sort_values(by=date_col).reset_index(drop=True)

    for column in NUMBER_COLUMNS + STAR_COLUMNS:
        if column in df.columns:
            df[column] = pd.to_numeric(
                df[column],
                errors='coerce',
            )

    return df, date_col


def _extract_numbers(row):
    """
    Extrai os cinco números válidos de um sorteio.
    """
    numbers = []

    for column in NUMBER_COLUMNS:
        if column in row.index and pd.notna(row[column]):
            number = int(row[column])

            if 1 <= number <= 50:
                numbers.append(number)

    return sorted(set(numbers))


def _extract_stars(row):
    """
    Extrai as duas estrelas válidas de um sorteio.
    """
    stars = []

    for column in STAR_COLUMNS:
        if column in row.index and pd.notna(row[column]):
            star = int(row[column])

            if 1 <= star <= 12:
                stars.append(star)

    return sorted(set(stars))


def build_feature_model(
    data: pd.DataFrame,
    date_col='date',
    recent_draws=50,
):
    """
    Cria as métricas utilizadas pelo simulador:

    - frequência histórica;
    - frequência recente;
    - atraso;
    - pares;
    - trios;
    - frequência das estrelas.
    """
    df, date_col = _prepare_dataframe(data, date_col)

    number_frequency = Counter()
    star_frequency = Counter()
    recent_number_frequency = Counter()
    recent_star_frequency = Counter()
    pair_frequency = Counter()
    triple_frequency = Counter()

    last_seen_number = {}
    last_seen_star = {}

    for row_index, row in df.iterrows():
        numbers = _extract_numbers(row)
        stars = _extract_stars(row)

        for number in numbers:
            number_frequency[number] += 1
            last_seen_number[number] = row_index

        for star in stars:
            star_frequency[star] += 1
            last_seen_star[star] = row_index

        for pair in combinations(numbers, 2):
            pair_frequency[tuple(sorted(pair))] += 1

        for triple in combinations(numbers, 3):
            triple_frequency[tuple(sorted(triple))] += 1

    recent_df = df.tail(recent_draws)

    for _, row in recent_df.iterrows():
        numbers = _extract_numbers(row)
        stars = _extract_stars(row)

        recent_number_frequency.update(numbers)
        recent_star_frequency.update(stars)

    total_draws = len(df)

    number_delay = {
        number: total_draws - 1 - last_seen_number.get(number, -1)
        for number in range(1, 51)
    }

    star_delay = {
        star: total_draws - 1 - last_seen_star.get(star, -1)
        for star in range(1, 13)
    }

    return {
        'dataframe': df,
        'date_col': date_col,
        'total_draws': total_draws,
        'number_frequency': number_frequency,
        'recent_number_frequency': recent_number_frequency,
        'number_delay': number_delay,
        'star_frequency': star_frequency,
        'recent_star_frequency': recent_star_frequency,
        'star_delay': star_delay,
        'pair_frequency': pair_frequency,
        'triple_frequency': triple_frequency,
    }


def calculate_number_scores(model):
    """
    Calcula uma pontuação relativa para os números.

    Pesos utilizados:

    - 50% frequência histórica;
    - 30% frequência recente;
    - 20% atraso normalizado.

    Esta é uma pontuação do modelo, não uma probabilidade real.
    """
    number_frequency = model['number_frequency']
    recent_frequency = model['recent_number_frequency']
    number_delay = model['number_delay']

    max_historical = max(
        number_frequency.values(),
        default=1,
    )

    max_recent = max(
        recent_frequency.values(),
        default=1,
    )

    max_delay = max(
        number_delay.values(),
        default=1,
    )

    scores = {}

    for number in range(1, 51):
        historical_score = (
            number_frequency.get(number, 0)
            / max_historical
        )

        recent_score = (
            recent_frequency.get(number, 0)
            / max_recent
        )

        delay_score = (
            number_delay.get(number, 0)
            / max_delay
        )

        score = (
            0.50 * historical_score
            + 0.30 * recent_score
            + 0.20 * delay_score
        )

        scores[number] = float(score)

    return scores


def calculate_star_scores(model):
    """
    Calcula a pontuação relativa das estrelas.
    """
    star_frequency = model['star_frequency']
    recent_star_frequency = model['recent_star_frequency']
    star_delay = model['star_delay']

    max_historical = max(
        star_frequency.values(),
        default=1,
    )

    max_recent = max(
        recent_star_frequency.values(),
        default=1,
    )

    max_delay = max(
        star_delay.values(),
        default=1,
    )

    scores = {}

    for star in range(1, 13):
        historical_score = (
            star_frequency.get(star, 0)
            / max_historical
        )

        recent_score = (
            recent_star_frequency.get(star, 0)
            / max_recent
        )

        delay_score = (
            star_delay.get(star, 0)
            / max_delay
        )

        score = (
            0.50 * historical_score
            + 0.30 * recent_score
            + 0.20 * delay_score
        )

        scores[star] = float(score)

    return scores


def _weighted_sample_without_replacement(
    values,
    scores,
    amount,
    rng,
):
    """
    Seleciona valores sem repetição usando pesos relativos.
    """
    selected = []
    available = list(values)

    for _ in range(amount):
        if not available:
            break

        weights = np.array(
            [
                max(float(scores.get(value, 0.001)), 0.001)
                for value in available
            ],
            dtype=float,
        )

        weight_total = weights.sum()

        if weight_total <= 0:
            probabilities = np.ones(len(available)) / len(available)
        else:
            probabilities = weights / weight_total

        selected_index = rng.choice(
            len(available),
            p=probabilities,
        )

        selected_value = available.pop(int(selected_index))
        selected.append(int(selected_value))

    return sorted(selected)


def _combination_score(
    numbers,
    stars,
    number_scores,
    star_scores,
    pair_frequency,
    triple_frequency,
    total_draws,
):
    """
    Calcula o score relativo de uma combinação.
    """
    number_score = sum(
        number_scores.get(number, 0)
        for number in numbers
    ) / max(len(numbers), 1)

    star_score = sum(
        star_scores.get(star, 0)
        for star in stars
    ) / max(len(stars), 1)

    pair_bonus = 0.0

    for pair in combinations(numbers, 2):
        pair_count = pair_frequency.get(
            tuple(sorted(pair)),
            0,
        )

        pair_bonus += pair_count

    pair_bonus = pair_bonus / max(len(list(combinations(numbers, 2))), 1)
    pair_bonus = pair_bonus / max(total_draws, 1)

    triple_bonus = 0.0

    for triple in combinations(numbers, 3):
        triple_count = triple_frequency.get(
            tuple(sorted(triple)),
            0,
        )

        triple_bonus += triple_count

    triple_bonus = triple_bonus / max(len(list(combinations(numbers, 3))), 1)
    triple_bonus = triple_bonus / max(total_draws, 1)

    odd_count = sum(number % 2 != 0 for number in numbers)
    even_count = len(numbers) - odd_count

    parity_balance = 1.0 if abs(odd_count - even_count) <= 1 else 0.0

    low_count = sum(number <= 25 for number in numbers)
    high_count = len(numbers) - low_count

    range_balance = 1.0 if abs(low_count - high_count) <= 1 else 0.0

    final_score = (
        0.55 * number_score
        + 0.20 * star_score
        + 0.10 * pair_bonus
        + 0.05 * triple_bonus
        + 0.05 * parity_balance
        + 0.05 * range_balance
    )

    return float(final_score)


def simulate_combinations(
    data: pd.DataFrame,
    num_simulations=10000,
    top_k=20,
    random_seed=None,
    date_col='date',
):
    """
    Gera combinações simuladas e devolve as melhores por ranking.
    """
    if num_simulations < 100:
        num_simulations = 100

    if num_simulations > 100000:
        num_simulations = 100000

    model = build_feature_model(
        data=data,
        date_col=date_col,
    )

    number_scores = calculate_number_scores(model)
    star_scores = calculate_star_scores(model)

    rng = np.random.default_rng(random_seed)

    combinations_map = {}

    for _ in range(num_simulations):
        numbers = _weighted_sample_without_replacement(
            values=range(1, 51),
            scores=number_scores,
            amount=5,
            rng=rng,
        )

        stars = _weighted_sample_without_replacement(
            values=range(1, 13),
            scores=star_scores,
            amount=2,
            rng=rng,
        )

        if len(numbers) != 5 or len(stars) != 2:
            continue

        key = (
            tuple(numbers),
            tuple(stars),
        )

        score = _combination_score(
            numbers=numbers,
            stars=stars,
            number_scores=number_scores,
            star_scores=star_scores,
            pair_frequency=model['pair_frequency'],
            triple_frequency=model['triple_frequency'],
            total_draws=model['total_draws'],
        )

        combinations_map[key] = max(
            combinations_map.get(key, 0.0),
            score,
        )

    ranked = sorted(
        combinations_map.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    if not ranked:
        raise ValueError(
            'Não foi possível gerar combinações.'
        )

    max_score = ranked[0][1]

    results = []

    for rank, (key, score) in enumerate(
        ranked[:top_k],
        start=1,
    ):
        numbers, stars = key

        relative_score = (
            score / max_score * 100
            if max_score > 0
            else 0
        )

        results.append({
            'rank': rank,
            'numbers': list(numbers),
            'stars': list(stars),
            'model_score': round(float(score), 8),
            'relative_score_percent': round(
                float(relative_score),
                4,
            ),
            'note': (
                'Pontuação relativa do modelo; '
                'não representa probabilidade real '
                'de acerto.'
            ),
        })

    return {
        'model': {
            'num_simulations': int(num_simulations),
            'unique_combinations': int(len(combinations_map)),
            'total_draws': int(model['total_draws']),
            'weights': {
                'historical_frequency': 0.50,
                'recent_frequency': 0.30,
                'delay': 0.20,
            },
        },
        'ranked_combinations': results,
        'top_numbers': [
            {
                'number': int(number),
                'score': round(
                    float(score),
                    8,
                ),
            }
            for number, score in sorted(
                number_scores.items(),
                key=lambda item: item[1],
                reverse=True,
            )[:20]
        ],
        'top_stars': [
            {
                'star': int(star),
                'score': round(
                    float(score),
                    8,
                ),
            }
            for star, score in sorted(
                star_scores.items(),
                key=lambda item: item[1],
                reverse=True,
            )[:12]
        ],
    }


def _draw_from_row(row):
    return {
        'numbers': set(_extract_numbers(row)),
        'stars': set(_extract_stars(row)),
    }


def backtest_model(
    data: pd.DataFrame,
    test_draws=20,
    simulations_per_draw=2000,
    top_k=10,
    date_col='date',
):
    """
    Backtesting temporal.

    Para cada sorteio de teste:
    - usa apenas os sorteios anteriores;
    - gera combinações;
    - compara a combinação real com o ranking;
    - mede acertos de números e estrelas.
    """
    df, date_col = _prepare_dataframe(
        data,
        date_col,
    )

    minimum_training_size = 30

    if len(df) <= minimum_training_size:
        return {
            'available': False,
            'message': (
                'São necessários pelo menos '
                f'{minimum_training_size + 1} sorteios.'
            ),
        }

    test_draws = min(
        max(int(test_draws), 1),
        len(df) - minimum_training_size,
    )

    first_test_index = len(df) - test_draws
    evaluations = []

    for test_index in range(
        first_test_index,
        len(df),
    ):
        training_data = df.iloc[:test_index].copy()
        actual_draw = _draw_from_row(df.iloc[test_index])

        simulation = simulate_combinations(
            data=training_data,
            num_simulations=simulations_per_draw,
            top_k=top_k,
            date_col=date_col,
        )

        candidates = simulation['ranked_combinations']

        best_number_hits = 0
        best_star_hits = 0
        best_total_hits = 0
        matched_rank = None

        for candidate in candidates:
            number_hits = len(
                set(candidate['numbers'])
                & actual_draw['numbers']
            )

            star_hits = len(
                set(candidate['stars'])
                & actual_draw['stars']
            )

            total_hits = number_hits + star_hits

            best_number_hits = max(
                best_number_hits,
                number_hits,
            )

            best_star_hits = max(
                best_star_hits,
                star_hits,
            )

            best_total_hits = max(
                best_total_hits,
                total_hits,
            )

            if (
                number_hits == 5
                and star_hits == 2
            ):
                matched_rank = candidate['rank']
                break

        evaluations.append({
            'test_index': int(test_index),
            'actual_numbers': sorted(
                actual_draw['numbers']
            ),
            'actual_stars': sorted(
                actual_draw['stars']
            ),
            'best_number_hits': int(best_number_hits),
            'best_star_hits': int(best_star_hits),
            'best_total_hits': int(best_total_hits),
            'jackpot_match_in_top_k': matched_rank,
        })

    average_number_hits = np.mean([
        item['best_number_hits']
        for item in evaluations
    ])

    average_star_hits = np.mean([
        item['best_star_hits']
        for item in evaluations
    ])

    average_total_hits = np.mean([
        item['best_total_hits']
        for item in evaluations
    ])

    best_result = max(
        evaluations,
        key=lambda item: item['best_total_hits'],
    )

    return {
        'available': True,
        'test_draws': int(len(evaluations)),
        'simulations_per_draw': int(simulations_per_draw),
        'top_k': int(top_k),
        'average_number_hits': round(
            float(average_number_hits),
            4,
        ),
        'average_star_hits': round(
            float(average_star_hits),
            4,
        ),
        'average_total_hits': round(
            float(average_total_hits),
            4,
        ),
        'best_result': best_result,
        'evaluations': evaluations,
        'limitations': [
            'Backtesting histórico não garante desempenho futuro.',
            'A pontuação é relativa e não é uma probabilidade real.',
            'Não foram usados dados físicos medidos da máquina.',
            'O sorteio pode ser independente do histórico.',
        ],
    }


def build_simulation_report(
    data: pd.DataFrame,
    num_simulations=10000,
    top_k=20,
    test_draws=20,
    simulations_per_draw=2000,
    date_col='date',
):
    """
    Gera o relatório completo para o frontend.
    """
    simulation = simulate_combinations(
        data=data,
        num_simulations=num_simulations,
        top_k=top_k,
        date_col=date_col,
    )

    backtest = backtest_model(
        data=data,
        test_draws=test_draws,
        simulations_per_draw=simulations_per_draw,
        top_k=min(top_k, 20),
        date_col=date_col,
    )

    return {
        'simulation': simulation,
        'backtest': backtest,
        'odds': {
            'jackpot': '1 em 139.838.160',
            'jackpot_probability_percent': 0.000000715,
            'warning': (
                'A probabilidade matemática do jackpot '
                'não é alterada pelo ranking estatístico.'
            ),
        },
    }
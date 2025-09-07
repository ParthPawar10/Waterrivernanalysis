#!/usr/bin/env python3
"""
Create train/test splits from river.csv.

Usage examples:
  python data_split.py --mode year --test-year 2023
  python data_split.py --mode random --test-size 0.2 --seed 42

This script writes `train.csv` and `test.csv` next to `river.csv`.
"""
import csv
import argparse
import random
from pathlib import Path


def read_rows(path):
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        for r in reader:
            # skip totally blank rows
            if not any(cell.strip() for cell in r):
                continue
            rows.append(r)
    return header, rows


def write_rows(path, header, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


def split_by_year(header, rows, test_year=2023):
    # Find index of Year column (case-insensitive)
    year_idx = None
    for i, name in enumerate(header):
        if name.strip().lower() == 'year':
            year_idx = i
            break
    if year_idx is None:
        raise RuntimeError('Year column not found in header')

    train = []
    test = []
    for r in rows:
        try:
            y = int(r[year_idx])
        except Exception:
            # if unparsable, send to train by default
            train.append(r)
            continue
        if y == test_year:
            test.append(r)
        else:
            train.append(r)
    return train, test


def split_random(header, rows, test_size=0.2, seed=0):
    n = len(rows)
    k = int(n * test_size)
    rnd = random.Random(seed)
    idx = list(range(n))
    rnd.shuffle(idx)
    test_idx = set(idx[:k])
    train = [rows[i] for i in range(n) if i not in test_idx]
    test = [rows[i] for i in range(n) if i in test_idx]
    return train, test


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--mode', choices=['year', 'random'], default='year')
    p.add_argument('--test-year', type=int, default=2023)
    p.add_argument('--test-size', type=float, default=0.2)
    p.add_argument('--seed', type=int, default=0)
    p.add_argument('--input', default='river.csv')
    p.add_argument('--out-train', default='train.csv')
    p.add_argument('--out-test', default='test.csv')
    args = p.parse_args()

    base = Path(args.input)
    if not base.exists():
        print('Input file not found:', base)
        return

    header, rows = read_rows(base)
    if args.mode == 'year':
        train, test = split_by_year(header, rows, test_year=args.test_year)
    else:
        train, test = split_random(header, rows, test_size=args.test_size, seed=args.seed)

    write_rows(Path(args.out_train), header, train)
    write_rows(Path(args.out_test), header, test)

    print(f'Read {len(rows)} rows; train={len(train)} test={len(test)}')


if __name__ == '__main__':
    main()

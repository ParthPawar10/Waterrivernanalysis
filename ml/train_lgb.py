import argparse
import os
import re
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import lightgbm as lgb


MONTH_MAP = {m: i for i, m in enumerate(['January','February','March','April','May','June','July','August','September','October','November','December'], start=1)}


def clean_number(x):
    if pd.isna(x):
        return np.nan
    s = str(x).strip()
    if s == '' or s.lower() in ('nil','bdl','na','n/a'):
        return np.nan
    # remove plus signs and non-digit except dot
    s = re.sub(r"[^0-9.\-]", '', s)
    try:
        return float(s)
    except:
        return np.nan


def load_and_preprocess(path):
    df = pd.read_csv(path)
    # drop rows with Lockdown or other non-numeric markers in Water Quality? keep and let targets be NaN
    # map Month name to number
    df['MonthNum'] = df['Month'].map(MONTH_MAP)
    # clean numeric targets
    for col in ['pH','DO (mg/L)','BOD (mg/L)','FC MPN/100ml','TC MPN/100ml']:
        if col in df.columns:
            df[col] = df[col].apply(clean_number)

    # year numeric
    df['Year'] = pd.to_numeric(df['Year'], errors='coerce')

    return df


def build_features(df, le_river=None, le_loc=None, fit_encoders=False):
    X = pd.DataFrame()
    # river & location encoders
    if fit_encoders:
        le_river = LabelEncoder()
        le_loc = LabelEncoder()
        X['river_enc'] = le_river.fit_transform(df['River'].astype(str))
        X['loc_enc'] = le_loc.fit_transform(df['Location'].astype(str))
    else:
        X['river_enc'] = le_river.transform(df['River'].astype(str))
        X['loc_enc'] = le_loc.transform(df['Location'].astype(str))

    # month cyclical
    X['month_sin'] = np.sin(2 * np.pi * df['MonthNum'] / 12)
    X['month_cos'] = np.cos(2 * np.pi * df['MonthNum'] / 12)
    X['year_off'] = df['Year'] - 2020

    return X, le_river, le_loc


def train_per_target(X_train, y_train, X_val, y_val, target_name):
    model = lgb.LGBMRegressor(n_estimators=1000, learning_rate=0.05, num_leaves=31)
    # use callbacks for early stopping to support a wider range of lightgbm versions
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], callbacks=[lgb.early_stopping(stopping_rounds=30)])
    return model


def main(args):
    os.makedirs('backend/models', exist_ok=True)

    print('Loading...')
    df_train = load_and_preprocess(args.train)
    df_test = load_and_preprocess(args.test)

    # drop rows with all targets NaN
    target_cols = ['pH','DO (mg/L)','BOD (mg/L)','FC MPN/100ml','TC MPN/100ml']
    # fit encoders on train
    X_train, le_river, le_loc = build_features(df_train, fit_encoders=True)
    X_test, _, _ = build_features(df_test, le_river=le_river, le_loc=le_loc, fit_encoders=False)

    # Save encoders
    joblib.dump({'le_river': le_river, 'le_loc': le_loc}, 'backend/models/encoders.joblib')

    models = {}
    metrics = {}
    # target transforms: use log1p for heavily skewed count targets
    transform_map = {
        'FC MPN/100ml': 'log1p',
        'TC MPN/100ml': 'log1p'
    }

    for target in target_cols:
        print(f'Training for {target}...')
        # remove NaNs for this target
        mask = df_train[target].notna()
        if mask.sum() < 10:
            print(f'  Not enough data for {target}, skipping.')
            continue
        X_t = X_train[mask]
        y_t_raw = df_train.loc[mask, target].values
        # apply transform if configured
        transform = transform_map.get(target)
        if transform == 'log1p':
            # guard against negative values
            y_t = np.log1p(np.clip(y_t_raw, 0, None))
        else:
            y_t = y_t_raw
        X_tr, X_val, y_tr, y_val = train_test_split(X_t, y_t, test_size=0.12, random_state=42)
        model = train_per_target(X_tr, y_tr, X_val, y_val, target)
        models[target] = model
        # evaluate on test set (only rows with non-null target)
        mask_test = df_test[target].notna()
        if mask_test.sum() > 0:
            y_true = df_test.loc[mask_test, target].values
            y_pred_trans = model.predict(X_test.loc[mask_test])
            # inverse transform if needed
            if transform == 'log1p':
                y_pred = np.expm1(y_pred_trans)
                # clip small negative numerical artifacts to zero
                y_pred = np.clip(y_pred, 0, None)
            else:
                y_pred = y_pred_trans
            mae = mean_absolute_error(y_true, y_pred)
            # compute RMSE in a backward-compatible way
            mse = mean_squared_error(y_true, y_pred)
            rmse = float(np.sqrt(mse))
            metrics[target] = {'mae': float(mae), 'rmse': float(rmse), 'n_test': int(mask_test.sum())}
            print(f'  Test MAE={mae:.3f} RMSE={rmse:.3f} (n={mask_test.sum()})')
        else:
            metrics[target] = {'mae': None, 'rmse': None, 'n_test': 0}

    # save models and metrics
    for t, m in models.items():
        fname = f'backend/models/{t.replace(" ","_").replace("/","_")}.joblib'
        joblib.dump(m, fname)
    # save transform metadata so backend can inverse-transform if needed
    with open('backend/models/transforms.json', 'w') as tf:
        json.dump(transform_map, tf, indent=2)
    with open('backend/models/metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)

    print('\nTraining complete. Models and encoders saved to backend/models/.')
    print('Metrics:')
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--train', required=True)
    parser.add_argument('--test', required=True)
    args = parser.parse_args()
    main(args)

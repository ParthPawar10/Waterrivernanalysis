"""
Water Quality Prediction Model
Predicts pH, DO (mg/L), BOD (mg/L), FC MPN/100ml, TC MPN/100ml, and Water Quality
based on River, Location, Month, and Year
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, classification_report, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

class WaterQualityPredictor:
    def __init__(self, csv_file_path):
        """
        Initialize the Water Quality Predictor
        
        Args:
            csv_file_path (str): Path to the CSV file containing water quality data
        """
        self.csv_file_path = csv_file_path
        self.data = None
        self.processed_data = None
        self.encoders = {}
        self.scalers = {}
        self.models = {}
        self.target_columns = ['pH', 'DO (mg/L)', 'BOD (mg/L)', 'FC MPN/100ml', 'TC MPN/100ml', 'Water Quality']
        
    def load_and_clean_data(self):
        """Load and clean the data"""
        print("Loading and cleaning data...")
        
        # Load the data
        self.data = pd.read_csv(self.csv_file_path)
        
        # Handle missing values and special cases
        self.data = self.data.replace(['NIL', 'BDL', 'Nil'], np.nan)
        
        # Clean numeric columns
        for col in ['pH', 'DO (mg/L)', 'BOD (mg/L)', 'FC MPN/100ml', 'TC MPN/100ml']:
            if col in self.data.columns:
                # Remove '+' signs and convert to numeric
                self.data[col] = self.data[col].astype(str).str.replace('+', '').str.replace('<', '')
                self.data[col] = pd.to_numeric(self.data[col], errors='coerce')
        
        # Remove rows where all data is missing (like Lockdown periods)
        self.data = self.data.dropna(subset=['pH', 'DO (mg/L)', 'BOD (mg/L)'], how='all')
        
        # Create month-to-number mapping
        month_mapping = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4,
            'May': 5, 'June': 6, 'July': 7, 'August': 8,
            'September': 9, 'October': 10, 'November': 11, 'December': 12
        }
        self.data['Month_Num'] = self.data['Month'].map(month_mapping)
        
        print(f"Data loaded: {len(self.data)} records")
        print(f"Columns: {list(self.data.columns)}")
        return self.data
    
    def preprocess_data(self):
        """Preprocess the data for machine learning"""
        print("Preprocessing data...")
        
        if self.data is None:
            self.load_and_clean_data()
        
        # Create a copy for processing
        self.processed_data = self.data.copy()
        
        # Encode categorical variables
        categorical_columns = ['River', 'Location']
        for col in categorical_columns:
            self.encoders[col] = LabelEncoder()
            self.processed_data[f'{col}_encoded'] = self.encoders[col].fit_transform(self.processed_data[col])
        
        # Create feature matrix
        feature_columns = ['River_encoded', 'Location_encoded', 'Month_Num', 'Year']
        self.X = self.processed_data[feature_columns]
        
        # Handle missing values in targets by forward fill and backward fill
        for col in self.target_columns:
            if col in self.processed_data.columns:
                self.processed_data[col] = self.processed_data[col].fillna(method='ffill').fillna(method='bfill')
        
        print("Data preprocessing completed")
        
    def train_models(self):
        """Train separate models for each target variable"""
        print("Training models...")
        
        if self.processed_data is None:
            self.preprocess_data()
        
        # Split data for training
        X_train, X_test, _, _ = train_test_split(self.X, self.X, test_size=0.2, random_state=42)
        
        # Train regression models for numeric targets
        numeric_targets = ['pH', 'DO (mg/L)', 'BOD (mg/L)', 'FC MPN/100ml', 'TC MPN/100ml']
        
        for target in numeric_targets:
            if target in self.processed_data.columns:
                print(f"Training model for {target}...")
                
                # Get target values
                y = self.processed_data[target].fillna(self.processed_data[target].median())
                
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(
                    self.X, y, test_size=0.2, random_state=42
                )
                
                # Train model
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                model.fit(X_train, y_train)
                
                # Evaluate
                y_pred = model.predict(X_test)
                mse = mean_squared_error(y_test, y_pred)
                mae = mean_absolute_error(y_test, y_pred)
                
                print(f"  {target} - MSE: {mse:.4f}, MAE: {mae:.4f}")
                
                self.models[target] = model
        
        # Train classification model for Water Quality
        if 'Water Quality' in self.processed_data.columns:
            print("Training model for Water Quality...")
            
            # Encode Water Quality
            self.encoders['Water Quality'] = LabelEncoder()
            y_quality = self.encoders['Water Quality'].fit_transform(self.processed_data['Water Quality'])
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                self.X, y_quality, test_size=0.2, random_state=42
            )
            
            # Train model
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            print(f"  Water Quality - Accuracy: {accuracy:.4f}")
            
            self.models['Water Quality'] = model
        
        print("Model training completed!")
    
    def predict_water_quality(self, river, location, month, year):
        """
        Predict water quality parameters for given inputs
        
        Args:
            river (str): Name of the river
            location (str): Location name
            month (str or int): Month name or number
            year (int): Year
            
        Returns:
            dict: Dictionary containing predictions for all parameters
        """
        if not self.models:
            print("Models not trained. Training now...")
            self.train_models()
        
        # Convert month to number if string
        if isinstance(month, str):
            month_mapping = {
                'January': 1, 'February': 2, 'March': 3, 'April': 4,
                'May': 5, 'June': 6, 'July': 7, 'August': 8,
                'September': 9, 'October': 10, 'November': 11, 'December': 12
            }
            month_num = month_mapping.get(month, month)
        else:
            month_num = month
        
        # Encode categorical variables
        try:
            river_encoded = self.encoders['River'].transform([river])[0]
        except ValueError:
            print(f"Warning: River '{river}' not in training data. Using most common river.")
            river_encoded = 0
        
        try:
            location_encoded = self.encoders['Location'].transform([location])[0]
        except ValueError:
            print(f"Warning: Location '{location}' not in training data. Using most common location.")
            location_encoded = 0
        
        # Create feature vector
        features = np.array([[river_encoded, location_encoded, month_num, year]])
        
        # Make predictions
        predictions = {}
        
        # Predict numeric targets
        numeric_targets = ['pH', 'DO (mg/L)', 'BOD (mg/L)', 'FC MPN/100ml', 'TC MPN/100ml']
        for target in numeric_targets:
            if target in self.models:
                pred = self.models[target].predict(features)[0]
                predictions[target] = round(pred, 2) if target == 'pH' else round(pred, 1)
        
        # Predict Water Quality
        if 'Water Quality' in self.models:
            quality_pred = self.models['Water Quality'].predict(features)[0]
            predictions['Water Quality'] = self.encoders['Water Quality'].inverse_transform([quality_pred])[0]
        
        return predictions
    
    def predict_future_trends(self, river, location, start_year, end_year):
        """
        Predict water quality trends for future years
        
        Args:
            river (str): Name of the river
            location (str): Location name
            start_year (int): Starting year for prediction
            end_year (int): Ending year for prediction
            
        Returns:
            pandas.DataFrame: DataFrame with predictions for all months and years
        """
        results = []
        
        months = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December']
        
        for year in range(start_year, end_year + 1):
            for month in months:
                prediction = self.predict_water_quality(river, location, month, year)
                prediction.update({
                    'River': river,
                    'Location': location,
                    'Month': month,
                    'Year': year
                })
                results.append(prediction)
        
        return pd.DataFrame(results)
    
    def visualize_predictions(self, predictions_df, parameter='pH'):
        """
        Visualize prediction trends
        
        Args:
            predictions_df (pandas.DataFrame): DataFrame with predictions
            parameter (str): Parameter to visualize
        """
        plt.figure(figsize=(12, 6))
        
        # Create a time series plot
        predictions_df['Date'] = pd.to_datetime(predictions_df[['Year', 'Month']].assign(day=1))
        
        plt.plot(predictions_df['Date'], predictions_df[parameter], marker='o', linewidth=2)
        plt.title(f'{parameter} Predictions Over Time')
        plt.xlabel('Date')
        plt.ylabel(parameter)
        plt.xticks(rotation=45)
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()
    
    def get_available_locations(self):
        """Get list of available rivers and locations"""
        if self.data is None:
            self.load_and_clean_data()
        
        locations_info = self.data.groupby('River')['Location'].unique().to_dict()
        return locations_info
    
    def generate_report(self, predictions_df):
        """Generate a summary report of predictions"""
        print("\n" + "="*60)
        print("WATER QUALITY PREDICTION REPORT")
        print("="*60)
        
        numeric_params = ['pH', 'DO (mg/L)', 'BOD (mg/L)', 'FC MPN/100ml', 'TC MPN/100ml']
        
        for param in numeric_params:
            if param in predictions_df.columns:
                print(f"\n{param}:")
                print(f"  Average: {predictions_df[param].mean():.2f}")
                print(f"  Range: {predictions_df[param].min():.2f} - {predictions_df[param].max():.2f}")
                print(f"  Trend: {'Improving' if predictions_df[param].iloc[-1] > predictions_df[param].iloc[0] else 'Declining'}")
        
        # Water Quality distribution
        if 'Water Quality' in predictions_df.columns:
            quality_counts = predictions_df['Water Quality'].value_counts()
            print(f"\nWater Quality Distribution:")
            for quality, count in quality_counts.items():
                percentage = (count / len(predictions_df)) * 100
                print(f"  {quality}: {count} months ({percentage:.1f}%)")


def main():
    """Main function to demonstrate the water quality predictor"""
    # Initialize the predictor
    predictor = WaterQualityPredictor('river.csv')
    
    # Load and preprocess data
    predictor.load_and_clean_data()
    predictor.preprocess_data()
    
    # Get available locations
    print("Available Rivers and Locations:")
    locations = predictor.get_available_locations()
    for river, locs in locations.items():
        print(f"  {river}: {', '.join(locs)}")
    
    # Train models
    predictor.train_models()
    
    # Example prediction for a specific month/year
    print("\n" + "="*60)
    print("EXAMPLE PREDICTIONS")
    print("="*60)
    
    # Predict for Mula river at Aundh Bridge for January 2024
    prediction = predictor.predict_water_quality('Mula', 'Aundh Bridge', 'January', 2024)
    print(f"\nPrediction for Mula - Aundh Bridge - January 2024:")
    for param, value in prediction.items():
        print(f"  {param}: {value}")
    
    # Predict trends for future years
    print(f"\nGenerating predictions for 2024-2026...")
    future_predictions = predictor.predict_future_trends('Mula', 'Aundh Bridge', 2024, 2026)
    
    # Generate report
    predictor.generate_report(future_predictions)
    
    # Save predictions to CSV
    future_predictions.to_csv('water_quality_predictions_2024_2026.csv', index=False)
    print(f"\nPredictions saved to 'water_quality_predictions_2024_2026.csv'")
    
    return predictor, future_predictions


if __name__ == "__main__":
    predictor, predictions = main()

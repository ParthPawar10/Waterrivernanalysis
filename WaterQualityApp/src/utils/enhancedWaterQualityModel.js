
// Enhanced Water Quality Prediction Model for Mobile App
export class WaterQualityPredictor {
  constructor() {
    this.modelData = require('../data/model_export.json');
    
    this.riverEncodings = this.modelData.encoders.rivers;
    this.locationEncodings = this.modelData.encoders.locations;
    this.seasonEncodings = this.modelData.encoders.seasons;
    
    this.coefficients = this.modelData.simplified_coefficients;
    this.stats = this.modelData.model_stats;
  }
  
  getSeason(month) {
    if ([12, 1, 2].includes(month)) return 'Winter';
    if ([3, 4, 5].includes(month)) return 'Spring';
    if ([6, 7, 8].includes(month)) return 'Summer';
    return 'Autumn';
  }
  
  predict(river, location, month, year) {
    const riverEncoded = this.riverEncodings[river] || 0;
    const locationEncoded = this.locationEncodings[location] || 0;
    const season = this.getSeason(month);
    const seasonEncoded = this.seasonEncodings[season] || 0;
    
    const predictions = {};
    
    Object.keys(this.coefficients).forEach(param => {
      const coef = this.coefficients[param];
      let value = coef.base;
      
      // Add effects
      value += coef.river_effect[riverEncoded] || 0;
      value += coef.location_effect[locationEncoded] || 0;
      value += coef.seasonal_effect[seasonEncoded] || 0;
      value += coef.month_coefficient * (month - 6); // Normalize around June
      value += coef.year_coefficient * (year - 2020); // Normalize around 2020
      
      // Apply realistic bounds
      if (param === 'pH') {
        value = Math.max(6.0, Math.min(9.0, value));
      } else if (param === 'DO (mg/L)') {
        value = Math.max(0, Math.min(15, value));
      } else if (param === 'BOD (mg/L)') {
        value = Math.max(0, Math.min(30, value));
      } else if (param.includes('MPN')) {
        value = Math.max(0, value);
      }
      
      predictions[param] = Math.round(value * 100) / 100;
    });
    
    // Determine water quality classification
    const ph = predictions['pH'];
    const do_level = predictions['DO (mg/L)'];
    const bod = predictions['BOD (mg/L)'];
    
    let waterQuality = 'Non Complying';
    if (ph >= 6.5 && ph <= 8.5 && do_level >= 5.0 && bod <= 3.0) {
      waterQuality = 'Complying';
    }
    
    predictions['Water Quality'] = waterQuality;
    
    return predictions;
  }
  
  getQualityColor(quality) {
    return quality === 'Complying' ? '#4CAF50' : '#f44336';
  }
  
  getParameterStatus(param, value) {
    switch(param) {
      case 'pH':
        if (value >= 6.5 && value <= 8.5) return 'Good';
        return 'Poor';
      case 'DO (mg/L)':
        if (value >= 5.0) return 'Good';
        if (value >= 3.0) return 'Moderate';
        return 'Poor';
      case 'BOD (mg/L)':
        if (value <= 3.0) return 'Good';
        if (value <= 6.0) return 'Moderate';
        return 'Poor';
      default:
        return 'Unknown';
    }
  }
  
  // Get historical predictions for chart display
  getHistoricalPredictions(river, location, months = 6) {
    const currentDate = new Date();
    const predictions = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const prediction = this.predict(river, location, date.getMonth() + 1, date.getFullYear());
      
      predictions.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        monthName: date.toLocaleString('default', { month: 'short' }),
        ...prediction
      });
    }
    
    return predictions;
  }
}

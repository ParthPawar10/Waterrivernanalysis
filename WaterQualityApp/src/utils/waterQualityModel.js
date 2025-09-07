// Water Quality Prediction Model (Simplified for mobile app)
export class WaterQualityPredictor {
  constructor() {
    // Simplified model coefficients based on the trained model
    this.riverEncodings = {
      'Mula': 0,
      'Mutha': 1,
      'Mula-Mutha': 2
    };
    
    this.locationEncodings = {
      'Aundh Bridge': 0,
      'Harrison Bridge': 1,
      'Mundhawa Bridge': 2,
      'Theur': 3,
      'Sangam Bridge': 4,
      'Veer Savarkar Bhavan': 5,
      'Deccan Bridge': 6,
      'Khadakvasla Dam': 7
    };
    
    // Simplified prediction coefficients (derived from the trained model)
    this.coefficients = {
      pH: {
        base: 7.5,
        river: [0.1, -0.2, 0.05],
        location: [0.2, 0.1, 0.0, -0.1, -0.15, -0.2, -0.25, 0.3],
        month: 0.02,
        season: [0.1, 0.0, -0.1, 0.05],
        year: 0.001
      },
      'DO (mg/L)': {
        base: 4.5,
        river: [0.3, 0.2, 0.1],
        location: [0.5, 0.3, 0.2, 0.4, 0.1, 0.0, -0.1, 1.5],
        month: 0.05,
        season: [0.2, 0.3, -0.2, 0.1],
        year: 0.002
      },
      'BOD (mg/L)': {
        base: 10.0,
        river: [-0.5, 0.2, -0.3],
        location: [-1.0, -0.5, 0.5, -2.0, 1.5, 2.0, 2.5, -6.0],
        month: -0.1,
        season: [-0.5, 0.2, 0.3, -0.2],
        year: -0.01
      },
      'FC MPN/100ml': {
        base: 500,
        river: [50, 100, 75],
        location: [200, 150, 100, 50, 300, 250, 300, -400],
        month: 10,
        season: [100, 50, -50, 0],
        year: -2
      },
      'TC MPN/100ml': {
        base: 1200,
        river: [100, 200, 150],
        location: [300, 250, 200, 100, 400, 350, 400, -800],
        month: 20,
        season: [150, 100, -100, 50],
        year: -5
      }
    };
  }
  
  getSeason(month) {
    if ([12, 1, 2].includes(month)) return 0; // Winter
    if ([3, 4, 5].includes(month)) return 1; // Spring
    if ([6, 7, 8].includes(month)) return 2; // Summer
    return 3; // Autumn
  }
  
  predict(river, location, month, year) {
    const riverEncoded = this.riverEncodings[river] || 0;
    const locationEncoded = this.locationEncodings[location] || 0;
    const season = this.getSeason(month);
    
    const predictions = {};
    
    Object.keys(this.coefficients).forEach(param => {
      const coef = this.coefficients[param];
      let value = coef.base;
      
      value += coef.river[riverEncoded] || 0;
      value += coef.location[locationEncoded] || 0;
      value += coef.month * (month - 6); // Normalize around June
      value += coef.season[season] || 0;
      value += coef.year * (year - 2020); // Normalize around 2020
      
      // Add some realistic bounds
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
}

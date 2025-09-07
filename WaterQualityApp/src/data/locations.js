// Pune water monitoring locations with precise coordinates
export const puneLocations = [
  {
    id: 1,
    name: 'Aundh Bridge',
    river: 'Mula',
    coordinate: {
      latitude: 18.568465,
      longitude: 73.807117
    },
    description: 'Mula River monitoring point at Aundh Bridge'
  },
  {
    id: 2,
    name: 'Harrison Bridge',
    river: 'Mula',
    coordinate: {
      latitude: 18.574768,
      longitude: 73.834709
    },
    description: 'Mula River monitoring point at Harrison Bridge'
  },
  {
    id: 3,
    name: 'Mundhawa Bridge',
    river: 'Mula-Mutha',
    coordinate: {
      latitude: 18.536328,
      longitude: 73.933377
    },
    description: 'Mula-Mutha confluence monitoring point'
  },
  {
    id: 4,
    name: 'Theur',
    river: 'Mula-Mutha',
    coordinate: {
      latitude: 18.528413,
      longitude: 74.037683
    },
    description: 'Mula-Mutha River monitoring point at Theur'
  },
  {
    id: 5,
    name: 'Sangam Bridge',
    river: 'Mutha',
    coordinate: {
      latitude: 18.529296,
      longitude: 73.860393
    },
    description: 'Mutha River monitoring point at Sangam Bridge'
  },
  {
    id: 6,
    name: 'Veer Savarkar Bhavan',
    river: 'Mutha',
    coordinate: {
      latitude: 18.520976,
      longitude: 73.849634
    },
    description: 'Mutha River monitoring point near Veer Savarkar Bhavan'
  },
  {
    id: 7,
    name: 'Deccan Bridge',
    river: 'Mutha',
    coordinate: {
      latitude: 18.513323,
      longitude: 73.842613
    },
    description: 'Mutha River monitoring point at Deccan Bridge'
  },
  {
    id: 8,
    name: 'Khadakvasla Dam',
    river: 'Mutha',
    coordinate: {
      latitude: 18.445044,
      longitude: 73.764876
    },
    description: 'Mutha River source at Khadakvasla Dam'
  },
  {
    id: 9,
    name: 'Shivaji Bridge',
    river: 'Mula',
    coordinate: {
  latitude: 18.533326,
  longitude: 73.855208
    },
    description: 'Mula River monitoring point at Shivaji Bridge'
  },
  {
    id: 10,
    name: 'Bund Garden',
    river: 'Mutha',
    coordinate: {
      latitude: 18.542854,
      longitude: 73.882704
    },
    description: 'Mutha River monitoring point near Bund Garden'
  },
  {
    id: 11,
    name: 'Warje Bridge',
    river: 'Mutha',
    coordinate: {
      latitude: 18.474062,
      longitude: 73.809220
    },
    description: 'Mutha River monitoring point at Warje Bridge'
  },
  {
    id: 12,
    name: 'Yerawada Bridge',
    river: 'Mula-Mutha',
    coordinate: {
      latitude: 18.543789,
      longitude: 73.886066
    },
    description: 'Mula-Mutha monitoring point at Yerawada Bridge'
  }
];

// Pune city center coordinates
export const puneCenter = {
  latitude: 18.5204,
  longitude: 73.8567,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

// Detailed river paths (more precise polylines)
export const riverPaths = {
  mula: [
    { latitude: 18.5789, longitude: 73.7950 }, // Upstream
    { latitude: 18.5712, longitude: 73.8001 },
    { latitude: 18.5634, longitude: 73.8026 },
    { latitude: 18.5579, longitude: 73.8072 }, // Aundh Bridge
    { latitude: 18.5523, longitude: 73.8134 },
    { latitude: 18.5467, longitude: 73.8198 },
    { latitude: 18.5411, longitude: 73.8262 },
    { latitude: 18.5356, longitude: 73.8326 },
    { latitude: 18.5301, longitude: 73.8391 },
    { latitude: 18.5246, longitude: 73.8455 },
    { latitude: 18.5204, longitude: 73.8567 }, // Harrison Bridge
    { latitude: 18.5189, longitude: 73.8634 },
    { latitude: 18.5145, longitude: 73.8723 },
    { latitude: 18.5112, longitude: 73.8834 },
    { latitude: 18.5089, longitude: 73.8945 },
    { latitude: 18.5074, longitude: 73.9077 }, // Confluence
  ],
  mutha: [
    { latitude: 18.4462, longitude: 73.7700 }, // Khadakvasla Dam
    { latitude: 18.4523, longitude: 73.7756 },
    { latitude: 18.4589, longitude: 73.7823 },
    { latitude: 18.4645, longitude: 73.7890 },
    { latitude: 18.4701, longitude: 73.7957 },
    { latitude: 18.4756, longitude: 73.8024 },
    { latitude: 18.4812, longitude: 73.8091 },
    { latitude: 18.4867, longitude: 73.8158 },
    { latitude: 18.4923, longitude: 73.8225 },
    { latitude: 18.4978, longitude: 73.8292 },
    { latitude: 18.5034, longitude: 73.8320 },
    { latitude: 18.5089, longitude: 73.8348 },
    { latitude: 18.5134, longitude: 73.8356 },
    { latitude: 18.5157, longitude: 73.8364 }, // Deccan Bridge
    { latitude: 18.5189, longitude: 73.8378 },
    { latitude: 18.5221, longitude: 73.8392 },
    { latitude: 18.5253, longitude: 73.8429 },
    { latitude: 18.5285, longitude: 73.8467 }, // Veer Savarkar Bhavan
    { latitude: 18.5267, longitude: 73.8534 },
    { latitude: 18.5234, longitude: 73.8612 },
    { latitude: 18.5201, longitude: 73.8689 },
    { latitude: 18.5167, longitude: 73.8745 },
    { latitude: 18.5123, longitude: 73.8801 },
    { latitude: 18.5089, longitude: 73.8834 },
    { latitude: 18.5057, longitude: 73.8850 }, // Sangam Bridge
    { latitude: 18.5074, longitude: 73.9077 }, // Confluence
  ],
  mulaMutha: [
    { latitude: 18.5074, longitude: 73.9077 }, // Mundhawa Bridge (Confluence)
    { latitude: 18.5034, longitude: 73.9134 },
    { latitude: 18.4989, longitude: 73.9201 },
    { latitude: 18.4945, longitude: 73.9268 },
    { latitude: 18.4901, longitude: 73.9335 },
    { latitude: 18.4856, longitude: 73.9389 },
    { latitude: 18.4812, longitude: 73.9423 },
    { latitude: 18.4767, longitude: 73.9456 },
    { latitude: 18.4723, longitude: 73.9467 },
    { latitude: 18.4678, longitude: 73.9471 },
    { latitude: 18.4648, longitude: 73.9473 }, // Theur
    { latitude: 18.4589, longitude: 73.9534 },
    { latitude: 18.4523, longitude: 73.9612 },
    { latitude: 18.4456, longitude: 73.9689 },
  ]
};

export const getRiverColor = (river) => {
  switch(river) {
    case 'Mula': return '#2196F3';
    case 'Mutha': return '#4CAF50';
    case 'Mula-Mutha': return '#FF9800';
    default: return '#9E9E9E';
  }
};

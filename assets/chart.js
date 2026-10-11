const data = [
  { label: "Solar", percentage: 3.60 },
  { label: "MSW", percentage: 4.80 },
  { label: "Wind", percentage: 12.80 },
  { label: "Hydro", percentage: 7.30 },
  { label: "Natural Gas", percentage: 13.70 },
  { label: "Diesel", percentage: 57.80 }
];

function createPieChart(data) {
  const chart = document.getElementById('pieChart');
  let cumulativePercentage = 0;

  data.forEach(item => {
    const slice = document.createElement('div');
    slice.className = 'slice';
    slice.style.backgroundColor = getRandomColor(); // Function defined below
    slice.style.transform = `rotate(${cumulativePercentage}deg)`;
    cumulativePercentage += item.percentage * 3.6; // Convert percentage to degrees
    chart.appendChild(slice);
  });
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

createPieChart(data);
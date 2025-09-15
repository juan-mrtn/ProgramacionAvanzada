import getData from '../utils/getData';

const Rocket = async (id) => {
  try {
    // Validate the ID (24-character hexadecimal for MongoDB ObjectID)
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return `<div class="Error">Invalid Launch ID: ${id}</div>`;
    }

    // Fetch the launch data
    const rocket = await getData(id);
    
    // Check if rocket data exists
    if (!rocket) {
      return `<div class="Error">Rocket not found</div>`;
    }

    // Check if links and patch exist, provide fallback for image
    const patchImage = rocket.links?.patch?.small || 'https://via.placeholder.com/150';
    const rocketName = rocket.name || 'Unknown Launch';
    const flightNumber = rocket.flight_number || 'N/A';
    const launchDate = rocket.date_utc ? new Date(rocket.date_utc).toLocaleString() : 'N/A';
    const details = rocket.details || 'No details available';
    const failures = rocket.failures && rocket.failures.length > 0
      ? rocket.failures.map(f => `Time: ${f.time || 'N/A'}s, Altitude: ${f.altitude || 'N/A'}, Reason: ${f.reason || 'N/A'}`).join('; ')
      : 'No failures reported';

    const view = `
      <div class="Rockets-inner">
        <article class="Rockets-card">
          <h2>${rocketName}</h2>
          <h3><img src="${patchImage}" alt="${rocketName} patch"></h3>
        </article>
          <article class="Rockets-card">
          <h3>Details: <span>${details}</span></h3>
          <h3>Flight Number: <span>${flightNumber}</span></h3>
          <h3>Launch Date: <span>${launchDate}</span></h3>
          <h3>Failures: <span>${failures}</span></h3>
        </article>
      </div>
    `;
    
    return view;
  } catch (error) {
    console.error('Error in Rocket component:', error);
    return `<div class="Error">Error loading launch data: ${error.message}</div>`;
  }
};

export default Rocket;
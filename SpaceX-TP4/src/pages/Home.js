import getData from '../utils/getData';

const Home = async () => {
  const data = await getData();
  console.log(data);

  const rockets = data?.results || [];

  const view = `
    <div class="Rockets">
      ${
        data.map(rocket => `
          <article class="Rockets-card">
            <a href="#/${rocket.id}">
          
              <h2>${rocket.name}</h2>
              <img src="${rocket.links.patch.small}" alt="${rocket.name} patch">
              
            </a>

          </article>
        `).join('')
      }
    </div>
  `;

  return view;
};

export default Home;

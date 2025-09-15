// router.js
import Header from '../templates/Header';
import Home from '../pages/Home';
import Rocket from '../pages/Rocket';
import Error404 from '../pages/Error404';

const routes = {
    '/': Home,
    '/:id': Rocket,
};

const router = async () => {
    const header = document.getElementById('header');
    const content = document.getElementById('content');

    header.innerHTML = await Header();

    const hash = location.hash.slice(1).toLowerCase() || '/';
    console.log('Hash:', hash); // Debug: Should log /5eb87cd9ffd86e000604b32a

    let render;
    if (hash === '/') {
        render = routes['/'];
    } else if (hash.match(/^\/[0-9a-fA-F]+$/)) {
        render = routes['/:id'];
        const id = hash.slice(1);
        console.log('ID:', id); 
        content.innerHTML = await render(id); 
        return;
    } else {
        render = Error404;
    }

    if (!render) {
        render = Error404;
    }

    content.innerHTML = await render();
};

export default router;
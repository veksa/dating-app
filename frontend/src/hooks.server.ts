import {sequence} from '@sveltejs/kit/hooks';
import type {Handle} from '@sveltejs/kit';

const handleChromeDevTools: Handle = async ({event, resolve}) => {
    if (event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
        return new Response(null, {status: 204});
    }

    return resolve(event);
};

export const handle = sequence(handleChromeDevTools);

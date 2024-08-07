import toast from 'react-hot-toast';

function generateCodeVerifier(length: number) {
	let text = '';
	const possible =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

function sha256(plain: string) {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a: ArrayBuffer) {
	return btoa(String.fromCharCode.apply(null, [...new Uint8Array(a)]))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

async function generateCodeChallenge(v: string) {
	const hashed = await sha256(v);
	const base64encoded = base64urlencode(hashed);
	return base64encoded;
}

export async function redirectToAuthCodeFlow(
	clientId: string,
	callbackUrl: string,
) {
	const scopes = [
		'user-read-private',
		// 'user-read-email',
		'user-read-playback-state',
		'user-modify-playback-state',
		'user-read-currently-playing',
		// 'user-read-playback-position',
		// 'user-top-read',
		'user-read-recently-played',
		'user-library-read',
		'user-library-modify',
	];

	const verifier = localStorage.spotify_verifier || generateCodeVerifier(128);
	const challenge = await generateCodeChallenge(verifier);

	localStorage.setItem('spotify_verifier', verifier);

	const params = new URLSearchParams();
	params.append('client_id', clientId);
	params.append('response_type', 'code');
	params.append('redirect_uri', callbackUrl + '/callback');
	params.append('scope', scopes.join(' '));

	params.append('code_challenge_method', 'S256');
	params.append('code_challenge', challenge);

	document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export const refreshToken = async (clientId: string, URL: string) => {
	const refreshToken = localStorage.spotify_verifier || '';
	const url = 'https://accounts.spotify.com/api/token';

	const payload = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId,
		}),
	};

	const body = await fetch(url, payload);
	const response = await body.json();
	localStorage.setItem('spotify_access_token', response.access_token);
	localStorage.setItem('spotify_verifier', response.refresh_token);
	localStorage.setItem(
		'spotify_expires_in',
		(Date.now() + response.expires_in * 1000) as unknown as string,
	);

	window.location.href = URL;
};

export async function getAccessToken(
	clientId: string,
	code: string,
	URL: string,
) {
	const verifier = localStorage.spotify_verifier || '';

	const at = localStorage.spotify_access_token || 'undefined';
	if (at !== 'undefined') return localStorage.spotify_access_token;

	const result = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			grant_type: 'authorization_code',
			code,
			redirect_uri: URL + '/callback',
			code_verifier: verifier,
		}),
	});

	const { access_token, refresh_token, expires_in } = await result.json();

	localStorage.setItem('spotify_verifier', refresh_token);
	localStorage.setItem('spotify_access_token', access_token);
	localStorage.setItem(
		'spotify_expires_in',
		(Date.now() + ((expires_in || 0) as number) * 1000) as unknown as string,
	);

	window.location.href = URL;
	return access_token;
}

async function getActiveDeviceId(accessToken: string, type: number) {
	const result = await fetch('https://api.spotify.com/v1/me/player/devices', {
		method: 'GET',
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	const { devices } = await result.json();
	const activeDevice = devices.find((device: Device) => device.is_active);

	if (!activeDevice) {
		toast.error(
			`Failed to ${type == 1 ? 'play/pause' : type == 2 ? 'skip' : 'seek'}`,
		);
		return false;
	}
	return activeDevice.id;
}

export async function fetchProfile(accessToken: string) {
	const result = await fetch('https://api.spotify.com/v1/me', {
		method: 'GET',
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	return await result.json();
}

export async function player(accessToken: string) {
	const result = await fetch('https://api.spotify.com/v1/me/player', {
		method: 'GET',
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (result.status === 204) {
		const res = await fetch(
			'https://api.spotify.com/v1/me/player/recently-played?limit=1',
			{
				method: 'GET',
				headers: { Authorization: `Bearer ${accessToken}` },
			},
		);
		const rel = await res.json();
		return [rel.items[0].track, false];
	}
	const x = await result.json();
	return [x, true];
}

export async function pause() {
	const accessToken = localStorage.spotify_access_token || '';

	const deviceId = await getActiveDeviceId(accessToken, 1);
	if (!deviceId) {
		return false;
	}

	const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: JSON.stringify({ device_id: deviceId }),
	});
	return res.status == 204;
}

export async function play() {
	const accessToken = localStorage.spotify_access_token || '';

	const deviceId = await getActiveDeviceId(accessToken, 1);
	if (!deviceId) {
		return false;
	}

	const res = await fetch('https://api.spotify.com/v1/me/player/play', {
		method: 'PUT',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: JSON.stringify({ device_id: deviceId }),
	});
	return res.status == 204;
}

export async function next() {
	const accessToken = localStorage.spotify_access_token || '';

	const deviceId = await getActiveDeviceId(accessToken, 2);
	if (!deviceId) {
		return false;
	}

	const res = await fetch('https://api.spotify.com/v1/me/player/next', {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: JSON.stringify({ device_id: deviceId }),
	});
	return res.status == 204;
}

export async function isPremium() {
	const accessToken = localStorage.spotify_access_token || '';

	const result = await fetch('https://api.spotify.com/v1/me', {
		method: 'GET',
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	const res = (await result.json()) as unknown as User;

	return res.product === 'premium';
}

export async function previous(
	currentlyPlaying: boolean,
	playingProgress: number,
) {
	const accessToken = localStorage.spotify_access_token || '';

	const deviceId = await getActiveDeviceId(accessToken, 2);
	if (!deviceId) {
		return false;
	}

	if (currentlyPlaying && playingProgress > 5000) {
		return seek(0);
	}
	const res = await fetch('https://api.spotify.com/v1/me/player/previous', {
		method: 'POST',
		headers: { Authorization: `Bearer ${accessToken}` },
		body: JSON.stringify({
			device_id: deviceId,
		}),
	});
	return res.status == 204;
}

export async function seek(position: number) {
	const accessToken = localStorage.spotify_access_token || '';

	const deviceId = await getActiveDeviceId(accessToken, 3);
	if (!deviceId) {
		return false;
	}

	const res = await fetch(
		`https://api.spotify.com/v1/me/player/seek?position_ms=${position}`,
		{
			method: 'PUT',
			headers: { Authorization: `Bearer ${accessToken}` },
			body: JSON.stringify({ device_id: deviceId }),
		},
	);

	return res.status == 204;
}

export async function heart(isHearted: boolean, trackId: string) {
	const accessToken = localStorage.spotify_access_token || '';
	let method = 'PUT';
	if (isHearted) {
		method = 'DELETE';
	}
	const res = await fetch(
		`https://api.spotify.com/v1/me/tracks?ids=${trackId}`,
		{
			method: method,
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	return res.status == 200;
}

export async function isHearted(trackId: string) {
	const accessToken = localStorage.spotify_access_token || '';
	const result = await fetch(
		`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`,
		{
			method: 'GET',
			headers: { Authorization: `Bearer ${accessToken}` },
		},
	);

	const res = await result.json();
	return res[0];
}

export function clearKeys() {
	localStorage.removeItem('spotify_verifier');
	localStorage.removeItem('spotify_access_token');
	localStorage.removeItem('spotify_refresh_token');
	localStorage.removeItem('spotify_expires_in');
}

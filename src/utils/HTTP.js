
export async function sendGetRequest(url,header=null) {
    const token = sessionStorage.getItem('token');
    try {
        const response = await fetch(url, 
            {
                method: 'GET',
                headers: {
                    ...header,
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer '+token 
                }
            }
        );
        if (response.ok) {
            return await response.json()
        } else {
            console.error('Error:', response.statusText);
        }
    } catch (error) {
        console.error('Error during GET request:', error);
    }
}

export async function sendPostRequest(url, json) {
    const token = sessionStorage.getItem('token');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer '+token 
            },
            body: JSON.stringify(json)
        });

        if (response.ok) {
            return await response.json();
        } else {
            console.error('Error:', response.statusText);
        }
    } catch (error) {
        console.error('Error during POST request:', error);
    }
}

export async function sendPatchRequest(url, json) {
    const token = sessionStorage.getItem('token');
    try {
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(json)
        });
        if (response.ok) {
            return await response.json();
        } else {
            console.error('Error:', response.statusText);
        }
    } catch (error) {
        console.error('Error during PATCH request:', error);
    }
}

export async function sendDeleteRequest(url, json) {
    const token = sessionStorage.getItem('token');
    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token,
            },
            body: JSON.stringify(json),
        });

        if (response.ok) {
            return await response.json();
        } else {
            console.error('Error:', response.statusText);
        }
    } catch (error) {
        console.error('Error during DELETE request:', error);
    }
}




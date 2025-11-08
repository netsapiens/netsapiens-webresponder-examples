class NetSapiensAPI {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.bearerToken = config.bearerToken;
        this.domain = config.domain || '~';
        this.user = config.user || '~';
    }

    /**
     * Test API authentication by listing domains
     * @returns {Promise<object>} - The domains response
     */
    async testAuthentication() {
        const url = `${this.baseUrl}/ns-api/v2/domains`;

        try {
            console.log('Testing NetSapiens API authentication...');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${this.bearerToken}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Authentication failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log('✓ NetSapiens API authentication successful');
            console.log(`  Found ${result.length || 0} domain(s)`);
            return result;

        } catch (error) {
            console.error('✗ NetSapiens API authentication failed:', error.message);
            throw error;
        }
    }

    /**
     * Transfer a call to another user/extension
     * @param {string} callId - The call ID (OrigCallID or TermCallID)
     * @param {string} destination - The destination user/extension (e.g., "10000")
     * @returns {Promise<object>} - The transfer response
     */
    async transferCall(callId, destination) {
        const url = `${this.baseUrl}/ns-api/v2/domains/${this.domain}/users/${this.user}/calls/${callId}/transfer`;

        const body = {
            'call-term-user': destination
        };

        try {
            console.log(`Initiating transfer for call ${callId} to ${destination}`);

            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'accept': 'application/json',
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Transfer failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`Transfer successful for call ${callId}:`, result);
            return result;

        } catch (error) {
            console.error(`Error transferring call ${callId}:`, error.message);
            throw error;
        }
    }
}

export default NetSapiensAPI;

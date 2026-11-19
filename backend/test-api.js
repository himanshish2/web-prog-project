
const BASE_URL = 'http://localhost:5000';

// Enter your registered credentials locally.
// Do not share your password.
const TEST_EMAIL = 'shriya.kukreja.25cse@bmu.edu.in';
const TEST_PASSWORD = 'hello123';

let cookie = '';
let createdRequestId = null;

const results = {
    passed: 0,
    failed: 0,
    skipped: 0
};

function report(status, message) {
    console.log(`${status} ${message}`);

    if (status === 'PASS') results.passed++;
    if (status === 'FAIL') results.failed++;
    if (status === 'SKIP') results.skipped++;
}

async function request(method, path, body = null, authenticated = false) {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (authenticated && cookie) {
        headers.Cookie = cookie;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });

    // Capture session cookie after login.
    const cookies = response.headers.getSetCookie
        ? response.headers.getSetCookie()
        : [response.headers.get('set-cookie')].filter(Boolean);

    if (cookies.length > 0) {
        cookie = cookies[0].split(';')[0];
    }

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    return {
        status: response.status,
        data
    };
}

function findCreatedRequest(value) {
    if (!value || typeof value !== 'object') return null;

    if (value.pickupLocation && (value.id || value._id)) {
        return value.id || value._id;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const result = findCreatedRequest(item);
            if (result) return result;
        }
    } else {
        for (const item of Object.values(value)) {
            const result = findCreatedRequest(item);
            if (result) return result;
        }
    }

    return null;
}

async function test(name, method, path, expectedStatus, body = null, auth = false) {
    try {
        const response = await request(method, path, body, auth);

        if (response.status === expectedStatus) {
            report('PASS', `${name} (${response.status})`);
            return response;
        }

        report(
            'FAIL',
            `${name} | Expected ${expectedStatus}, received ${response.status}`
        );

        console.log('   Response:', JSON.stringify(response.data));
        return null;

    } catch (error) {
        report('FAIL', `${name} | ${error.message}`);
        return null;
    }
}

async function runTests() {
    console.log('\n================================');
    console.log('       CAMPUSCARRY API TESTS');
    console.log('================================\n');

    // 1. Health check
    await test(
        'Backend health',
        'GET',
        '/api/health',
        200
    );

    // 2. Authentication protection
    await test(
        'Unauthenticated profile blocked',
        'GET',
        '/api/auth/me',
        401
    );

    await test(
        'Unauthenticated requests blocked',
        'GET',
        '/api/requests',
        401
    );

    // 3. Login
    if (
        TEST_EMAIL === 'YOUR_EMAIL_HERE' ||
        TEST_PASSWORD === 'YOUR_PASSWORD_HERE' ||
        !TEST_EMAIL.trim() ||
        !TEST_PASSWORD.trim()
    ) {
        report('SKIP', 'Login and authenticated tests: enter test credentials first');

    } else {
        const login = await test(
            'User login',
            'POST',
            '/api/auth/login',
            200,
            {
                email: TEST_EMAIL,
                password: TEST_PASSWORD
            }
        );

        if (login) {

            // 4. Session/profile
            await test(
                'Authenticated profile',
                'GET',
                '/api/auth/me',
                200,
                null,
                true
            );

            // 5. Request listing
            await test(
                'Get available requests',
                'GET',
                '/api/requests',
                200,
                null,
                true
            );

            await test(
                'Get my requests',
                'GET',
                '/api/requests/mine',
                200,
                null,
                true
            );

            await test(
                'Get assigned deliveries',
                'GET',
                '/api/requests/delivering',
                200,
                null,
                true
            );

            // 6. Create a test parcel request
            const create = await test(
                'Create parcel request',
                'POST',
                '/api/requests',
                201,
                {
                    pickupLocation: 'Test Hostel',
                    dropLocation: 'Test Main Gate',
                    companyName: 'Test Courier',
                    agentName: 'Test Agent',
                    agentMobile: '9876543210',
                    pickupOtp: '123456',
                    itemDescription: 'Automated API test parcel',
                    reward: 50,
                    deadline: new Date(
                        Date.now() + 2 * 60 * 60 * 1000
                    ).toISOString()
                },
                true
            );

            if (create) {
                createdRequestId = findCreatedRequest(create.data);

                if (createdRequestId) {
                    report('PASS', `Created request ID: ${createdRequestId}`);

                    // 7. Cancel the test request
                    await test(
                        'Cancel test parcel request',
                        'PATCH',
                        `/api/requests/${createdRequestId}/cancel`,
                        200,
                        null,
                        true
                    );

                } else {
                    report('FAIL', 'Could not find created request ID in response');
                }
            }

        } else {
            report('SKIP', 'Authenticated tests skipped because login failed');
        }
    }

    // Final report
    console.log('\n================================');
    console.log('             SUMMARY');
    console.log('================================');

    console.log(`PASSED:  ${results.passed}`);
    console.log(`FAILED:  ${results.failed}`);
    console.log(`SKIPPED: ${results.skipped}`);

    console.log('--------------------------------');

    if (results.failed === 0 && results.skipped === 0) {
        console.log('ALL TESTS PASSED!');
    } else if (results.failed > 0) {
        console.log('SOME TESTS FAILED. Check the errors above.');
    } else {
        console.log('SOME TESTS WERE SKIPPED.');
    }

    console.log('================================\n');
}

runTests();

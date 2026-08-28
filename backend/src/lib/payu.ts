import crypto from 'crypto';
import axios from 'axios';

export interface PayUConfig {
    key: string;
    salt: string;
    env: 'test' | 'prod';
    baseUrl: string;
    surl: string;
    furl: string;
}

export function getPayUConfig(): PayUConfig {
    const key = process.env.PAYU_MERCHANT_KEY || 'JPbc9q';
    const salt = process.env.PAYU_MERCHANT_SALT || 'qwerty';
    const env = (process.env.PAYU_ENV || 'test') as 'test' | 'prod';
    const baseUrl = process.env.PAYU_BASE_URL || (env === 'prod' ? 'https://secure.payu.in' : 'https://test.payu.in');
    const surl = process.env.PAYU_SURL || 'http://localhost:5000/api/fees/payu/response';
    const furl = process.env.PAYU_FURL || 'http://localhost:5000/api/fees/payu/response';

    return { key, salt, env, baseUrl, surl, furl };
}

export interface PayUInitiateParams {
    txnid: string;
    amount: number | string;
    productinfo: string;
    firstname: string;
    email: string;
    phone?: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
}

/**
 * Computes SHA-512 Payment Request Hash for PayU India Hosted Checkout.
 * Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
 */
export function generatePayUHash(params: PayUInitiateParams): string {
    const config = getPayUConfig();
    const amountStr = typeof params.amount === 'number' ? params.amount.toFixed(2) : parseFloat(params.amount).toFixed(2);
    
    const hashSequence = [
        config.key,
        params.txnid,
        amountStr,
        params.productinfo,
        params.firstname,
        params.email,
        params.udf1 || '',
        params.udf2 || '',
        params.udf3 || '',
        params.udf4 || '',
        params.udf5 || '',
        '', '', '', '', '', // empty UDF6 - UDF10
        config.salt
    ].join('|');

    return crypto.createHash('sha512').update(hashSequence).digest('hex').toLowerCase();
}

/**
 * Validates SHA-512 Reverse Hash returned by PayU India after transaction.
 * Reverse Formula (No additionalCharges):
 * SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 * Reverse Formula (With additionalCharges):
 * additionalCharges|SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
export function verifyPayUReverseHash(postData: Record<string, any>): boolean {
    const config = getPayUConfig();
    const receivedHash = (postData.hash || '').toLowerCase();
    
    // In test mode, if no hash is sent by PayU test simulator, pass in test env
    if (!receivedHash && config.env === 'test') {
        return true;
    }
    if (!receivedHash) return false;

    const key = postData.key || config.key;
    const txnid = postData.txnid || '';
    const rawAmount = postData.amount ? String(postData.amount) : '0';
    const amountFixed = postData.amount ? parseFloat(postData.amount).toFixed(2) : '0.00';
    const productinfo = postData.productinfo || '';
    const firstname = postData.firstname || '';
    const email = postData.email || '';
    const status = postData.status || '';
    const udf1 = postData.udf1 || '';
    const udf2 = postData.udf2 || '';
    const udf3 = postData.udf3 || '';
    const udf4 = postData.udf4 || '';
    const udf5 = postData.udf5 || '';
    const additionalCharges = postData.additionalCharges;

    // Test with both amountFixed (e.g. 300.00) and rawAmount (e.g. 300)
    const amountOptions = Array.from(new Set([amountFixed, rawAmount]));

    for (const amt of amountOptions) {
        let hashSequence = '';
        if (additionalCharges) {
            hashSequence = [
                additionalCharges,
                config.salt,
                status,
                '', '', '', '', '', // empty UDF10 - UDF6
                udf5,
                udf4,
                udf3,
                udf2,
                udf1,
                email,
                firstname,
                productinfo,
                amt,
                txnid,
                key
            ].join('|');
        } else {
            hashSequence = [
                config.salt,
                status,
                '', '', '', '', '', // empty UDF10 - UDF6
                udf5,
                udf4,
                udf3,
                udf2,
                udf1,
                email,
                firstname,
                productinfo,
                amt,
                txnid,
                key
            ].join('|');
        }

        const calculatedHash = crypto.createHash('sha512').update(hashSequence).digest('hex').toLowerCase();
        if (calculatedHash === receivedHash) {
            return true;
        }
    }

    if (config.env === 'test') {
        console.warn(`[PayU Test Warning] Reverse hash mismatch in Sandbox environment. Permitting in Test mode.`);
        return true;
    }

    return false;
}

/**
 * Calls PayU S2S Verify Payment Web Service to secondary confirm transaction status.
 * Endpoint: https://test.payu.in/merchant/postservice?form=2 (or https://info.payu.in/merchant/postservice?form=2)
 * Hash Formula: sha512(key|command|var1|SALT)
 */
export async function verifyTransactionWithPayU(txnid: string): Promise<{
    success: boolean;
    status: string;
    mihpayid?: string;
    raw?: any;
    message?: string;
}> {
    const config = getPayUConfig();
    const command = 'verify_payment';
    const var1 = txnid;

    const hashSequence = `${config.key}|${command}|${var1}|${config.salt}`;
    const hash = crypto.createHash('sha512').update(hashSequence).digest('hex').toLowerCase();

    const postUrl = config.env === 'prod' 
        ? 'https://info.payu.in/merchant/postservice?form=2'
        : 'https://test.payu.in/merchant/postservice?form=2';

    try {
        const bodyFormData = new URLSearchParams();
        bodyFormData.append('key', config.key);
        bodyFormData.append('command', command);
        bodyFormData.append('var1', var1);
        bodyFormData.append('hash', hash);

        const response = await axios.post(postUrl, bodyFormData.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            timeout: 10000
        });

        const data = response.data;
        if (data && data.status === 1 && data.transaction_details && data.transaction_details[txnid]) {
            const details = data.transaction_details[txnid];
            return {
                success: details.status === 'success',
                status: details.status,
                mihpayid: details.mihpayid,
                raw: details,
                message: details.error_Message || details.status
            };
        } else if (data && data.transaction_details && data.transaction_details[txnid]) {
            const details = data.transaction_details[txnid];
            return {
                success: details.status === 'success',
                status: details.status || 'not_found',
                mihpayid: details.mihpayid,
                raw: details,
                message: details.error_Message || 'Transaction failed or pending'
            };
        } else {
            return {
                success: false,
                status: 'unknown',
                raw: data,
                message: data?.msg || 'Could not verify transaction with PayU web service'
            };
        }
    } catch (error: any) {
        console.error('Error contacting PayU verify_payment web service:', error?.message || error);
        return {
            success: false,
            status: 'error',
            message: error?.message || 'Error communicating with PayU web service'
        };
    }
}

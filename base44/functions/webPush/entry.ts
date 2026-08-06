import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.7';

// Module-level VAPID cache to avoid DB fetch on every request
let cachedVapidKeys = null;

async function getVapidKeys(base44) {
    if (cachedVapidKeys) return cachedVapidKeys;
    let vapidKeys = await base44.asServiceRole.entities.VapidKey.filter({});
    let keys;
    if (vapidKeys.length === 0) {
        keys = webpush.generateVAPIDKeys();
        await base44.asServiceRole.entities.VapidKey.create({
            public_key: keys.publicKey,
            private_key: keys.privateKey,
            subject: 'mailto:admin@apexcoach.app'
        });
    } else {
        keys = {
            publicKey: vapidKeys[0].public_key,
            privateKey: vapidKeys[0].private_key,
            subject: vapidKeys[0].subject || 'mailto:admin@apexcoach.app'
        };
    }
    cachedVapidKeys = keys;
    return keys;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (req.method !== 'POST') {
            return Response.json({ error: 'Method not allowed' }, { status: 405 });
        }
        
        const payload = await req.json();
        const { action, subscription, message, title, icon, url, targetUserId } = payload;
        
        const keys = await getVapidKeys(base44);
        webpush.setVapidDetails(
            keys.subject,
            keys.publicKey,
            keys.privateKey
        );

        if (action === 'getPublicKey') {
            return Response.json({ publicKey: keys.publicKey });
        }

        // subscribe action can be called pre-auth on some platforms, handle gracefully
        let user = null;
        try {
            user = await base44.auth.me();
        } catch (e) {}

        if (!user && action !== 'subscribe') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (action === 'subscribe') {
            if (!subscription) throw new Error("Missing subscription");
            
            // Delete any old subscriptions for this user and re-insert fresh
            const existing = await base44.entities.PushSubscription.filter({ user_id: user.id });
            for (const sub of existing) {
                await base44.entities.PushSubscription.delete(sub.id);
            }
            await base44.entities.PushSubscription.create({
                user_id: user.id,
                endpoint: subscription.endpoint,
                keys: subscription.keys
            });
            return Response.json({ success: true });
        }

        if (action === 'unsubscribe') {
            if (!subscription) throw new Error("Missing subscription");
            const existing = await base44.entities.PushSubscription.filter({ endpoint: subscription.endpoint });
            for (const sub of existing) {
                await base44.entities.PushSubscription.delete(sub.id);
            }
            return Response.json({ success: true });
        }

        if (action === 'send') {
            const userId = targetUserId || user.id;
            
            const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: userId });
            
            if (subs.length === 0) {
                return Response.json({ success: false, message: 'No active subscriptions for user' });
            }
            
            const payloadData = JSON.stringify({
                title: title || 'New Notification',
                body: message || 'You have a new message',
                icon: icon || '/icon-192x192.png',
                badge: '/icon-192x192.png',
                url: url || '/',
                tag: 'apex-notification',
                renotify: true
            });

            const pushOptions = {
                urgency: 'high',
                TTL: 86400, // 24 hours
            };

            let successCount = 0;
            const sendPromises = subs.map(sub => {
                return webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: sub.keys
                }, payloadData, pushOptions).then(() => {
                    successCount++;
                }).catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // Delete expired subscription
                        return base44.asServiceRole.entities.PushSubscription.delete(sub.id);
                    }
                    console.error('Error sending push to endpoint:', sub.endpoint, err);
                });
            });

            await Promise.all(sendPromises);
            return Response.json({ success: true, sentTo: successCount, totalSubs: subs.length });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("webPush error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
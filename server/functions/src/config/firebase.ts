import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({
        projectId: process.env.GCLOUD_PROJECT || 'food-fit-with-genkit',
    });
}

export const db = getFirestore();

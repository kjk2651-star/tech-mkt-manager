
import { db } from './firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export async function resetCampaigns() {
    try {
        const querySnapshot = await getDocs(collection(db, 'campaigns'));
        const deletePromises = querySnapshot.docs.map((d) => deleteDoc(doc(db, 'campaigns', d.id)));
        await Promise.all(deletePromises);
        console.log('All campaigns deleted successfully.');
        return true;
    } catch (error) {
        console.error('Error resetting campaigns:', error);
        return false;
    }
}

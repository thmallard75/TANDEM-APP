import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/** Sur le web : recadre au carré et réduit à 320 px, pour ne pas envoyer une photo de 5 Mo. */
async function squareJpegWeb(uri: string): Promise<Blob> {
  const img = new window.Image();
  img.src = uri;
  await img.decode();
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 320;
  canvas
    .getContext('2d')!
    .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 320, 320);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image illisible'))), 'image/jpeg', 0.85),
  );
}

/**
 * Ouvre la photothèque, envoie la photo choisie et l'enregistre sur le profil.
 * Renvoie false si la personne a annulé.
 */
export async function pickAndUploadAvatar(memberId: string): Promise<boolean> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.4,
  });
  if (result.canceled || !result.assets?.[0]) return false;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Connecte-toi d’abord.');

  const uri = result.assets[0].uri;
  const body = Platform.OS === 'web' ? await squareJpegWeb(uri) : await (await fetch(uri)).arrayBuffer();
  const path = `${auth.user.id}/avatar.jpg`;

  const { error } = await supabase.storage.from('avatars').upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  // Le suffixe ?v= force le rechargement quand la photo change.
  const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
  const { error: e2 } = await supabase.from('members').update({ avatar_url: url }).eq('id', memberId);
  if (e2) throw e2;
  return true;
}

export async function removeAvatar(memberId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) await supabase.storage.from('avatars').remove([`${auth.user.id}/avatar.jpg`]);
  const { error } = await supabase.from('members').update({ avatar_url: null }).eq('id', memberId);
  if (error) throw error;
}

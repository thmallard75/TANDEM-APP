import { useFonts } from 'expo-font';
import { Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';

export function useAppFonts() {
  const [loaded] = useFonts({
    Outfit_500Medium,
    Outfit_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });
  return loaded;
}

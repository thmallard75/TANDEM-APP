import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';

export function useAppFonts() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });
  return loaded;
}

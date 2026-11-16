import { Alert, Platform } from 'react-native';

/** Alert.alert ne fait rien sur react-native-web : on bascule sur window.alert. */
export function alert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

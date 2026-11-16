import { alert } from '@/lib/alert';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { partnerOf, useStore } from '@/lib/store';
import { syncDeviceCalendars } from '@/lib/calendar';
import { getIcsConnector, removeIcs, saveIcsUrl, syncIcs, type IcsConnector } from '@/lib/ics';
import { Avatar, Button, Card, Header, Input, P, Screen, SectionTitle } from '@/components/ui';
import { theme } from '@/lib/theme';
import { inviteLink } from '@/lib/invite';

export default function Foyer() {
  const { household, members, me, children, load } = useStore();
  const partner = partnerOf(me, members);
  const [childName, setChildName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [ics, setIcs] = useState<IcsConnector | null>(null);
  const [icsUrl, setIcsUrl] = useState('');
  const [icsBusy, setIcsBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  async function invite() {
    if (!household) return;
    const message = `Rejoins notre foyer sur Tandem 😉\n\n1. Ouvre ce lien : ${inviteLink(household.invite_code)}\n2. Crée ton compte (email + mot de passe)\n3. Mets ton prénom et touche « Rejoindre le foyer » : le code est déjà rempli.\n\nSi on te le demande, le code est ${household.invite_code}`;
    if (Platform.OS === 'web') {
      await navigator.clipboard?.writeText(message);
      return alert('Invitation copiée', 'Colle-la dans WhatsApp ou un SMS : elle contient le lien et les 3 étapes.');
    }
    await Share.share({ message });
  }

  async function addChild() {
    if (!childName.trim() || !household) return;
    const { error } = await supabase.from('children').insert({ household_id: household.id, first_name: childName.trim() });
    if (error) return alert('Oups', error.message);
    setChildName('');
    await load();
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsGuest(!!data.user?.is_anonymous));
  }, []);

  async function savePassword() {
    if (newPassword.length < 6) return alert('Mot de passe trop court', 'Il faut au moins 6 caractères.');
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwBusy(false);
    if (error) return alert('Oups', error.message);
    setNewPassword('');
    alert('C\u2019est enregistré', 'Tu peux maintenant te connecter partout avec ton email et ce mot de passe.');
  }

  useEffect(() => {
    if (me) getIcsConnector(me.id).then(setIcs);
  }, [me?.id]);

  async function syncOnline() {
    if (!household || !me) return;
    setIcsBusy(true);
    try {
      const n = await syncIcs(household.id, me.id);
      alert('Agenda lu', n ? `${n} nouvelle(s) tâche(s) repérée(s).` : 'Rien de nouveau côté famille dans les 30 prochains jours.');
      setIcs(await getIcsConnector(me.id));
      await load();
    } catch (e: any) {
      alert('Oups', e.message ?? 'La lecture de l\u2019agenda a échoué');
    } finally {
      setIcsBusy(false);
    }
  }

  async function connectIcs() {
    if (!me) return;
    const url = icsUrl.trim();
    if (!/^(https|webcal):\/\//i.test(url)) return alert('Lien incomplet', 'Colle le lien entier, il commence par https://');
    setIcsBusy(true);
    try {
      await saveIcsUrl(me.id, url);
      setIcsUrl('');
      setIcs(await getIcsConnector(me.id));
    } catch (e: any) {
      setIcsBusy(false);
      return alert('Oups', e.message ?? 'Enregistrement impossible');
    }
    await syncOnline();
  }

  async function disconnectIcs() {
    if (!me) return;
    try {
      await removeIcs(me.id);
      setIcs(null);
    } catch (e: any) {
      alert('Oups', e.message ?? 'Suppression impossible');
    }
  }

  async function sync() {
    if (!household || !me) return;
    setSyncing(true);
    try {
      const r = await syncDeviceCalendars(household.id, me.id);
      if (r.denied) alert('Accès refusé', 'Autorise le calendrier dans les réglages du téléphone.');
      else alert('Synchronisé', `${r.synced} nouvelle(s) tâche(s) repérée(s).`);
      await load();
    } catch (e: any) {
      alert('Oups', e.message ?? 'La synchro a échoué');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }} showsVerticalScrollIndicator={false}>
        <Header eyebrow="Foyer" title={household?.name ?? ''} />

        <SectionTitle>L'équipe</SectionTitle>
        <Card>
          {members.map((m) => (
            <View key={m.id} style={styles.row}>
              <Avatar name={m.display_name} size={36} tone={m.id === me?.id ? 'primary' : 'sand'} />
              <Text style={styles.name}>{m.display_name}</Text>
              {m.id === me?.id && <Text style={styles.you}>toi</Text>}
            </View>
          ))}
          {!partner && (
            <>
              <View style={styles.inviteBox}>
                <Text style={styles.code}>{household?.invite_code}</Text>
                <Text style={styles.codeLabel}>code du foyer · à donner à ton partenaire</Text>
              </View>
              <Button title="Inviter mon partenaire" onPress={invite} icon={<Ionicons name="paper-plane" size={16} color={theme.onGradient} />} />
            </>
          )}
        </Card>

        <SectionTitle>Les enfants</SectionTitle>
        <Card>
          {children.length === 0 && <P muted>Ajoute leurs prénoms : Tandem s'en sert pour relier les tâches au bon enfant.</P>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {children.map((c) => (
              <View key={c.id} style={styles.chip}>
                <Text style={styles.chipText}>{c.first_name}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input placeholder="Prénom" value={childName} onChangeText={setChildName} onSubmitEditing={addChild} autoCapitalize="words" />
            </View>
            <Pressable onPress={addChild} style={styles.addBtn}>
              <Ionicons name="add" size={24} color={theme.onGradient} />
            </Pressable>
          </View>
        </Card>

        <SectionTitle>Agendas</SectionTitle>
        <Card>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="link" size={20} color={theme.mint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Agenda en ligne</Text>
              <Text style={styles.sub}>
                {ics
                  ? ics.last_sync_at
                    ? `Connecté · lu le ${new Date(ics.last_sync_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
                    : 'Connecté'
                  : 'Google Agenda, Outlook, iCloud · lecture seule'}
              </Text>
            </View>
          </View>
          {ics ? (
            <>
              <Button title="Synchroniser maintenant" onPress={syncOnline} loading={icsBusy} variant="ghost" />
              <Button title="Retirer cet agenda" onPress={disconnectIcs} variant="quiet" />
            </>
          ) : (
            <>
              <P muted>
                Dans Google Agenda : Paramètres → ton agenda → « Adresse secrète au format iCal ». Copie ce lien et colle-le ici.
              </P>
              <Input placeholder="https://calendar.google.com/calendar/ical/…" autoCapitalize="none" autoCorrect={false} value={icsUrl} onChangeText={setIcsUrl} />
              <Button title="Connecter mon agenda" onPress={connectIcs} loading={icsBusy} />
              <Text style={styles.sub}>Ce lien donne accès en lecture à ton agenda : ne le partage avec personne d'autre.</Text>
            </>
          )}
        </Card>

        {Platform.OS !== 'web' && (
          <Card>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="calendar" size={20} color={theme.mint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>Calendriers du téléphone</Text>
                <Text style={styles.sub}>Lecture seule · 30 prochains jours</Text>
              </View>
            </View>
            <Button title="Synchroniser maintenant" onPress={sync} loading={syncing} variant="ghost" />
          </Card>
        )}

        <Card style={{ opacity: 0.6 }}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="mail" size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Gmail</Text>
              <Text style={styles.sub}>Bientôt · en attente de validation Google</Text>
            </View>
          </View>
        </Card>

        {!isGuest && (
          <>
            <SectionTitle>Mon compte</SectionTitle>
            <Card>
              <P muted>Choisis un mot de passe pour te connecter sur tes autres appareils sans passer par un mail.</P>
              <Input placeholder="Nouveau mot de passe" secureTextEntry autoCapitalize="none" value={newPassword} onChangeText={setNewPassword} />
              <Button title="Enregistrer le mot de passe" onPress={savePassword} loading={pwBusy} variant="ghost" />
            </Card>
          </>
        )}

        <Button title="Se déconnecter" onPress={() => supabase.auth.signOut()} variant="quiet" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: theme.bodyMedium, fontSize: 16, color: theme.ink, flex: 1 },
  sub: { fontFamily: theme.body, fontSize: 13, color: theme.muted },
  you: { fontFamily: theme.bodyMedium, fontSize: 12, color: theme.muted },
  inviteBox: { backgroundColor: theme.field, borderWidth: 1, borderColor: theme.line, borderRadius: theme.radiusSm, padding: 14, alignItems: 'center', gap: 2 },
  code: { fontFamily: theme.display, fontSize: 24, color: theme.mint, letterSpacing: 2 },
  codeLabel: { fontFamily: theme.body, fontSize: 12, color: theme.muted },
  chip: { backgroundColor: theme.primarySoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  chipText: { fontFamily: theme.bodyMedium, fontSize: 14, color: theme.mint },
  addBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: theme.mint, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

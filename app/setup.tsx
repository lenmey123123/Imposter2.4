// app/setup.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Platform, 
    TouchableOpacity, // Für Test-Button in SetupScreen
    ViewStyle, TextStyle, // Für Typisierungen
    Animated, ActivityIndicator, Dimensions, FlatList, TextInput, ScrollView, Pressable // Fehlende Imports ergänzt
} from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router'; 
import { useThemeColors, ThemeColors } from '../constants/Colors'; 
import { Fonts, FontSizes, LineHeights } from '../constants/Typography'; 
import { useGame } from '../contexts/GameContext';
import PagerView from 'react-native-pager-view'; // Wird für die volle Struktur benötigt
import Wrapper from '../components/Wrapper';     // Wird für die volle Struktur benötigt
import { Ionicons } from '@expo/vector-icons'; 
import { CATEGORIES, RANDOM_CATEGORY_NAME } from '../constants/Words';

// Hartecodierte Fallback-Werte für Schriften
const FALLBACK_FONT_REGULAR = Platform.select({ ios: 'System', android: 'sans-serif' });
const FALLBACK_FONT_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'sans-serif-bold' });
const FALLBACK_FONT_SEMI_BOLD = Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'sans-serif-medium' });


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 12;
const DEFAULT_PLAYERS = 4;
const DEFAULT_IMPOSTERS = 1;
const MIN_PLAYERS_FOR_TWO_IMPOSTERS = 6;
const MIN_ROUND_TIME = 30;
const MAX_ROUND_TIME = 600;
const DEFAULT_ROUND_TIME = 120; 
const ROUND_TIME_STEP = 30;

type DimensionValue = number | `${number}%` | undefined;

// makeStyles wird für Styles verwendet, die nicht direkt im Testfokus liegen
const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
    pagerScreenContainer: { flex: 1, backgroundColor: Colors.primaryBackground },
    pageStyle: { flex: 1 },
    // headerContent wird hier definiert, aber im SetupScreen für den StepIndicator-Wrapper überschrieben wir es testweise
    headerContent: { width: '100%', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 20 : 15, paddingBottom: 5 },
    
    // Diese Styles werden vom originalen StepIndicator verwendet, nicht von der vereinfachten Testversion
    stepIndicatorContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, height: 40 },
    stepDotBase: { marginHorizontal: 12, justifyContent: 'center', alignItems: 'center', width: 22, height: 22, borderRadius: 11 },
    stepDotInactive: { backgroundColor: Colors.disabled },
    stepDotActive: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 6 },
    stepTextInactive: { fontFamily: Fonts.OpenSans.SemiBold, fontSize: FontSizes.caption, color: Colors.primaryText },
    stepTextActive: { fontFamily: Fonts.OpenSans.Bold, fontSize: FontSizes.body, color: Colors.accentText },
    
    pageTitle: { fontFamily: Fonts.OpenSans.Bold, fontSize: FontSizes.h1 + 2, color: Colors.primaryText, textAlign: 'center', marginBottom: 25 },
    sectionTitle: { fontFamily: Fonts.OpenSans.Bold, fontSize: FontSizes.h2 - 1, color: Colors.primaryText, marginTop: 20, marginBottom: 15, textAlign: 'center' },
    optionalSubtitleText: { fontFamily: Fonts.OpenSans.Regular, fontSize: FontSizes.caption, color: Colors.secondaryText, textAlign: 'center', marginTop: -15, marginBottom: 20 },
    mainInteractionAreaScroll: { flex: 1, width: '100%' },
    mainInteractionAreaContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
    footerContent: { width: '100%', height: 90, justifyContent: 'center', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 20 : 10, paddingTop: 10, backgroundColor: Colors.primaryBackground, borderTopWidth:1, borderTopColor: Colors.borderColor },
    swipeHintText: { color: Colors.secondaryText, fontStyle: 'italic', fontSize: FontSizes.caption -1, fontFamily: Fonts.OpenSans.Regular },
    playerCountInfo: { fontFamily: Fonts.OpenSans.Regular, fontSize: FontSizes.caption, color: Colors.secondaryText, textAlign: 'center', marginBottom: 30 },
    imposterHintText: { fontFamily: Fonts.OpenSans.Regular, fontSize: FontSizes.caption, fontStyle: 'italic', color: Colors.secondaryText, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
    nameInputListStyle: { width: '100%' },
    nameInputColumnWrapper: { justifyContent: 'space-between' },
    playerInputItemContainer: { width: '48%' as DimensionValue, marginBottom: 15 },
    textInput: { fontFamily: Fonts.OpenSans.Regular, fontSize: FontSizes.body - 1, color: Colors.primaryText, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.borderColor, borderRadius: 10, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 14 : 10, height: 50 },
    textInputFocused: { borderColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 15, paddingVertical: 5 },
    stepperButton: { paddingHorizontal: 20, paddingVertical: 10 },
    stepperTimeText: { fontFamily: Fonts.OpenSans.Bold, fontSize: FontSizes.h1 + 10, color: Colors.primaryText, textAlign: 'center', minWidth: 120 },
    roundTimeHintText: { fontFamily: Fonts.OpenSans.Regular, fontSize: FontSizes.caption, fontStyle: 'italic', color: Colors.secondaryText, textAlign: 'center', marginTop: 8, marginBottom: 20 },    
    startButtonPressableWrapper: { width: SCREEN_WIDTH * 0.85, maxWidth: 450 },
    startButton: { height: 95, backgroundColor: Colors.accent, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 9 },
    startButtonDisabled: { backgroundColor: Colors.disabled },
    startButtonText: { fontFamily: Fonts.OpenSans.Bold, fontSize: FontSizes.h1 + 8, color: Colors.accentText, letterSpacing: 2 },
});

// --- Prop Interfaces ---
interface StepIndicatorProps { currentStep: 1 | 2 | 3; } 
interface PlayerCounterProps { count: number; onIncrement: () => void; onDecrement: () => void; min: number; max: number; theme: ThemeColors; }
interface ImposterSelectorProps { selectedImposters: number; onSelect: (count: number) => void; playerCount: number; minPlayersForTwo: number; theme: ThemeColors; }
interface PlayerInputItemProps { item: string; index: number; onPlayerNameChange: (text: string, index: number) => void; themeColors: ThemeColors; stylesObject: ReturnType<typeof makeStyles>;}
interface TimeStepperProps { currentTime: number; onIncrement: () => void; onDecrement: () => void; minTime: number; maxTime: number; theme: ThemeColors; }

interface StepContentProps { themeColors: ThemeColors; }
interface Step1ContentProps extends StepContentProps { playerCount: number; imposterCount: number; onPlayerCountChange: (count: number) => void; onImposterCountChange: (count: number) => void; }
interface Step2ContentProps extends StepContentProps { playerCount: number; playerNames: string[]; selectedRoundTime: number; onPlayerNamesChange: (names: string[]) => void; onIncrementTime: () => void; onDecrementTime: () => void; }
interface Step3ContentProps extends StepContentProps { selectedCategoryName: string; hintEnabled: boolean; onSelectCategory: (name: string) => void; onToggleHint: () => void; }

// --- Interne UI-Komponenten (VEREINFACHT oder unverändert für Testzwecke) ---

// StepIndicator STARK VEREINFACHT: Verwendet KEINE makeStyles und KEIN theme-Prop für Styles
const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const containerStyle: ViewStyle = { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, height: 40, backgroundColor: 'rgba(220,220,220,0.1)'};
  const stepDotBaseStyle: ViewStyle = { marginHorizontal: 12, justifyContent: 'center', alignItems: 'center', width: 22, height: 22, borderRadius: 11 };
  const stepDotInactiveStyle: ViewStyle = { backgroundColor: '#E0E0E0' }; 
  const stepDotActiveStyle: ViewStyle = { width: 32, height: 32, borderRadius: 16, backgroundColor: '#007AFF' }; 
  const stepTextInactiveStyle: TextStyle = { color: '#333333', fontFamily: FALLBACK_FONT_REGULAR, fontSize: 12 }; 
  const stepTextActiveStyle: TextStyle = { color: '#FFFFFF', fontFamily: FALLBACK_FONT_BOLD, fontSize: 16 };
  return ( <View style={containerStyle}> {[1, 2, 3].map((stepNum) => { const isActive = stepNum === currentStep; return ( <View key={stepNum} style={[stepDotBaseStyle, isActive ? stepDotActiveStyle : stepDotInactiveStyle]}> <Text style={isActive ? stepTextActiveStyle : stepTextInactiveStyle}>{stepNum}</Text> </View> ); })} </View> );
};

// PlayerCounter und ImposterSelector (VEREINFACHTE Versionen, verwenden theme direkt für Farben/Fonts)
const PlayerCounter: React.FC<PlayerCounterProps> = ({ count, onIncrement, onDecrement, min, max, theme }) => {
  const simplifiedTextStyle: TextStyle = { fontSize: 16, color: theme.primaryText, marginBottom: 8, fontFamily: FALLBACK_FONT_SEMI_BOLD };
  const counterTextStyle: TextStyle = { fontSize: 40, color: theme.primaryText, marginHorizontal: 15, fontFamily: FALLBACK_FONT_BOLD };
  const buttonTextStyle: TextStyle = { fontSize: 28 };
  return ( <View style={{ marginVertical: 20, alignItems: 'center', padding:10, backgroundColor: 'rgba(200,200,0,0.05)' }}> <Text style={simplifiedTextStyle}>PlayerCounter (Simplified)</Text> <View style={{ flexDirection: 'row', alignItems: 'center' }}> <TouchableOpacity onPress={onDecrement} disabled={count <= min} style={{ padding: 10 }}> <Text style={[buttonTextStyle, {color: count <= min ? theme.disabledText : theme.accent}]}>-</Text> </TouchableOpacity> <Text style={counterTextStyle}>{count}</Text> <TouchableOpacity onPress={onIncrement} disabled={count >= max} style={{ padding: 10 }}> <Text style={[buttonTextStyle, {color: count >= max ? theme.disabledText : theme.accent}]}>+</Text> </TouchableOpacity> </View> </View> );
};

const ImposterSelector: React.FC<ImposterSelectorProps> = ({ selectedImposters, onSelect, playerCount, minPlayersForTwo, theme }) => {
  const canSelectTwo = playerCount >= minPlayersForTwo;
  const simplifiedTextStyle: TextStyle = { fontSize: 16, color: theme.primaryText, marginBottom: 8, fontFamily: FALLBACK_FONT_SEMI_BOLD };
  const hintTextStyle: TextStyle = {color: theme.secondaryText, marginTop: 8, fontSize: 12 /*FontSizes.caption*/, fontFamily: FALLBACK_FONT_REGULAR }; // FontSizes.caption ggf. durch festen Wert ersetzen, wenn Typography.ts nicht zuverlässig ist
  return ( <View style={{ marginVertical: 20, alignItems: 'center', padding:10, backgroundColor: 'rgba(0,200,200,0.05)' }}> <Text style={simplifiedTextStyle}>ImposterSelector (Simplified)</Text> <View style={{ flexDirection: 'row', padding: 6, backgroundColor: theme.surface, borderRadius: 30 }}> <Pressable onPress={() => onSelect(1)} style={{ paddingVertical: 10, paddingHorizontal: 25, borderRadius: 24, backgroundColor: selectedImposters === 1 ? theme.accent : 'transparent'}}> <Text style={{ color: selectedImposters === 1 ? theme.accentText : theme.primaryText, fontFamily: FALLBACK_FONT_SEMI_BOLD }}>1 Imposter</Text> </Pressable> <Pressable onPress={() => { if (canSelectTwo) onSelect(2); }} disabled={!canSelectTwo} style={{ paddingVertical: 10, paddingHorizontal: 25, borderRadius: 24, backgroundColor: selectedImposters === 2 && canSelectTwo ? theme.accent : 'transparent', opacity: !canSelectTwo ? 0.5 : 1.0 }}> <Text style={{ color: selectedImposters === 2 && canSelectTwo ? theme.accentText : (!canSelectTwo ? theme.disabledText : theme.primaryText), fontFamily: FALLBACK_FONT_SEMI_BOLD }}>2 Imposters</Text> </Pressable> </View> <Text style={hintTextStyle}>{canSelectTwo ? "Wähle die Anzahl." : `Mind. ${minPlayersForTwo} Spieler für 2.`}</Text> </View> );
};

// PlayerInputItem und TimeStepper (Originalimplementierungen)
const PlayerInputItem: React.FC<PlayerInputItemProps> = ({ item, index, onPlayerNameChange, themeColors, stylesObject }) => {
    const [isFocused, setIsFocused] = useState(false);
    return ( <View style={stylesObject.playerInputItemContainer}>  <TextInput style={[stylesObject.textInput, isFocused && stylesObject.textInputFocused]} value={item} onChangeText={(text) => onPlayerNameChange(text, index)} placeholder={`Spieler ${index + 1}`} placeholderTextColor={themeColors.disabledText} maxLength={15} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}/> </View> );
};

const TimeStepper: React.FC<TimeStepperProps> = ({ currentTime, onIncrement, onDecrement, minTime, maxTime, theme }) => {
  const styles = makeStyles(theme); 
  const displayMinutes = Math.floor(currentTime / 60); 
  const displaySeconds = currentTime % 60;
  return ( <View style={styles.stepperContainer}> <TouchableOpacity style={styles.stepperButton} onPress={onDecrement} disabled={currentTime <= minTime}> <Ionicons name="remove-circle-sharp" size={52} color={currentTime <= minTime ? theme.disabledText : theme.accent} /> </TouchableOpacity> <Text style={styles.stepperTimeText}>{`${displayMinutes}:${displaySeconds < 10 ? '0' : ''}${displaySeconds}`}</Text> <TouchableOpacity style={styles.stepperButton} onPress={onIncrement} disabled={currentTime >= maxTime}> <Ionicons name="add-circle-sharp" size={52} color={currentTime >= maxTime ? theme.disabledText : theme.accent} /> </TouchableOpacity> </View> );
};


// --- Step Content Komponenten ---
// Step1Content (mit makeStyles für eigene Texte, aber vereinfachten Kind-Komponenten)
const Step1Content: React.FC<Step1ContentProps> = ({ playerCount, imposterCount, onPlayerCountChange, onImposterCountChange, themeColors }) => {
  const styles = makeStyles(themeColors); 
  return ( 
    <Wrapper style={styles.pageStyle} backgroundColor={themeColors.primaryBackground}> 
        <View style={styles.headerContent}>
            <Text style={styles.pageTitle}>Spieler & Imposter</Text>
        </View> 
        <ScrollView 
            style={styles.mainInteractionAreaScroll} 
            contentContainerStyle={styles.mainInteractionAreaContent} 
            showsVerticalScrollIndicator={false}
        >
            <PlayerCounter 
                count={playerCount} 
                onIncrement={() => onPlayerCountChange(Math.min(MAX_PLAYERS, playerCount + 1))} 
                onDecrement={() => onPlayerCountChange(Math.max(MIN_PLAYERS, playerCount - 1))} 
                min={MIN_PLAYERS} 
                max={MAX_PLAYERS} 
                theme={themeColors}
            />
            <Text style={styles.playerCountInfo}>Min {MIN_PLAYERS} / Max {MAX_PLAYERS} Spieler</Text>
            <ImposterSelector 
                selectedImposters={imposterCount} 
                onSelect={onImposterCountChange} 
                playerCount={playerCount} 
                minPlayersForTwo={MIN_PLAYERS_FOR_TWO_IMPOSTERS} 
                theme={themeColors}
            />
        </ScrollView>
    </Wrapper> 
  );
};

// Step2Content (mit makeStyles und wiederhergestellten Kind-Komponenten)
const Step2Content: React.FC<Step2ContentProps> = ({ playerCount, playerNames, selectedRoundTime, onPlayerNamesChange, onIncrementTime, onDecrementTime, themeColors }) => {
    const styles = makeStyles(themeColors);
    const handleLocalPlayerNameChange = useCallback((text: string, index: number) => { const newPlayerNames = [...playerNames]; newPlayerNames[index] = text; onPlayerNamesChange(newPlayerNames); }, [playerNames, onPlayerNamesChange]);
    const renderPlayerInputItem = useCallback(({ item, index }: { item: string, index: number }) => ( <PlayerInputItem item={item} index={index} onPlayerNameChange={handleLocalPlayerNameChange} themeColors={themeColors} stylesObject={styles} /> ), [styles, themeColors, handleLocalPlayerNameChange]);
    
    return ( 
        <Wrapper style={styles.pageStyle} backgroundColor={themeColors.primaryBackground}> 
            <View style={styles.headerContent}><Text style={styles.pageTitle}>Namen & Runde</Text></View> 
            <ScrollView style={styles.mainInteractionAreaScroll} contentContainerStyle={styles.mainInteractionAreaContent}>
                <Text style={styles.sectionTitle}>Spielernamen</Text>
                 {playerNames.length === playerCount ? ( <FlatList data={playerNames} renderItem={renderPlayerInputItem} keyExtractor={(_item, index) => `s2-player-name-${index}`} numColumns={2} columnWrapperStyle={styles.nameInputColumnWrapper} scrollEnabled={false} style={styles.nameInputListStyle}/> ) : ( <View style={{alignItems: 'center', paddingVertical: 20}}><ActivityIndicator size="small" color={themeColors.accent} /></View> )}
                <Text style={styles.sectionTitle}>Rundenlänge</Text>
                <TimeStepper currentTime={selectedRoundTime} onIncrement={onIncrementTime} onDecrement={onDecrementTime} minTime={MIN_ROUND_TIME} maxTime={MAX_ROUND_TIME} theme={themeColors}/>
                <Text style={styles.roundTimeHintText}>Min: {MIN_ROUND_TIME} Sek, Max: {MAX_ROUND_TIME} Sek ({MAX_ROUND_TIME / 60} Min)</Text>
            </ScrollView>
        </Wrapper> 
    );
};

// Step3Content (minimaler Inhalt)
const Step3Content: React.FC<Step3ContentProps> = ({ themeColors }) => {
    const styles = makeStyles(themeColors);
    return (
        <Wrapper style={styles.pageStyle} backgroundColor={themeColors.primaryBackground}>
            <View style={styles.headerContent}>
                <Text style={styles.pageTitle}>Letzte Details (Minimal)</Text>
            </View>
            <ScrollView style={styles.mainInteractionAreaScroll} contentContainerStyle={styles.mainInteractionAreaContent}>
                <Text style={{color: themeColors.primaryText, fontSize: 18, padding: 20, textAlign: 'center', fontFamily: Fonts.OpenSans.Regular}}>
                    Step 3 Inhalt - Minimal
                </Text>
            </ScrollView>
        </Wrapper>
    );
};

// --- Haupt-Setup-Komponente mit PagerView ---
export default function SetupScreen() {
  const router = useRouter();
  const Colors = useThemeColors();
  const { resetGame, initializeGame } = useGame();
  const dynamicStyles = makeStyles(Colors); 
  const pagerRef = useRef<PagerView>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [playerCount, setPlayerCount] = useState(DEFAULT_PLAYERS);
  const [imposterCount, setImposterCount] = useState(DEFAULT_IMPOSTERS);
  const [playerNames, setPlayerNames] = useState<string[]>(() => Array.from({ length: DEFAULT_PLAYERS }, (_, i) => `Spieler ${i + 1}`));
  const [selectedRoundTime, setSelectedRoundTime] = useState(DEFAULT_ROUND_TIME);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(RANDOM_CATEGORY_NAME);
  const [hintEnabled, setHintEnabled] = useState(true);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const startButtonScaleAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect( useCallback(() => { resetGame(); setPlayerCount(DEFAULT_PLAYERS); setImposterCount(DEFAULT_IMPOSTERS); setPlayerNames(Array.from({ length: DEFAULT_PLAYERS }, (_, i) => `Spieler ${i + 1}`)); setSelectedRoundTime(DEFAULT_ROUND_TIME); setSelectedCategoryName(RANDOM_CATEGORY_NAME); setHintEnabled(true); setIsStartingGame(false); if (pagerRef.current) { pagerRef.current.setPageWithoutAnimation(0); } setCurrentPage(0); return () => {}; }, [resetGame]) );
  useEffect(() => { setPlayerNames(currentNames => { const newNames = Array.from({ length: playerCount }, (_, i) => (currentNames[i] && currentNames[i].trim() !== "" && i < currentNames.length) ? currentNames[i] : `Spieler ${i + 1}` ); return newNames; }); }, [playerCount]);
  const handlePageSelected = (event: { nativeEvent: { position: number } }) => { setCurrentPage(event.nativeEvent.position); };
  const animateButtonPress = (scaleValue: Animated.Value, toVal: number, onComplete?: () => void) => { Animated.spring(scaleValue, { toValue: toVal, friction: 5, tension: 80, useNativeDriver: Platform.OS !== 'web' }).start(onComplete); };
  const handleFinalStartGame = () => { if (isStartingGame) return; setIsStartingGame(true); const finalPlayerNames = playerNames.map((name, index) => (name && name.trim() !== '') ? name.trim() : `Spieler ${index + 1}`); initializeGame(playerCount, imposterCount, selectedCategoryName, hintEnabled, selectedRoundTime, finalPlayerNames); setTimeout(() => router.push('/role-reveal-github'), 100); };

  return (
    <View style={dynamicStyles.pagerScreenContainer}>
      <Stack.Screen options={{ title: "Spiel einrichten" }} />
      
      <View style={dynamicStyles.headerContent}> 
        <StepIndicator currentStep={(currentPage + 1) as 1 | 2 | 3} />
      </View>
      
      <PagerView 
        style={{ flex: 1 }} 
        initialPage={0} 
        onPageSelected={handlePageSelected} 
        ref={pagerRef}
      >
        <View key="1" style={{flex: 1}}> 
            <Step1Content 
                playerCount={playerCount} 
                imposterCount={imposterCount} 
                onPlayerCountChange={setPlayerCount} 
                onImposterCountChange={setImposterCount} 
                themeColors={Colors}
            />
        </View>
        <View key="2" style={{flex: 1}}>
            <Step2Content 
                playerCount={playerCount} 
                playerNames={playerNames} 
                selectedRoundTime={selectedRoundTime}
                onPlayerNamesChange={setPlayerNames}
                onIncrementTime={() => setSelectedRoundTime((prev: number) => Math.min(MAX_ROUND_TIME, prev + ROUND_TIME_STEP))} 
                onDecrementTime={() => setSelectedRoundTime((prev: number) => Math.max(MIN_ROUND_TIME, prev - ROUND_TIME_STEP))} 
                themeColors={Colors}
            />
        </View>
        <View key="3" style={{flex: 1}}>
            <Step3Content 
                selectedCategoryName={selectedCategoryName} 
                hintEnabled={hintEnabled} 
                onSelectCategory={setSelectedCategoryName}
                onToggleHint={() => setHintEnabled((prev: boolean) => !prev)} 
                themeColors={Colors}
            />
        </View>
      </PagerView>
      
      <View style={dynamicStyles.footerContent}>
        {currentPage < 2 ? (
            <Text style={dynamicStyles.swipeHintText}>Swipe für nächsten Schritt</Text>
        ) : (
            <Pressable onPressIn={() => !isStartingGame && animateButtonPress(startButtonScaleAnim, 0.95)} onPressOut={() => !isStartingGame && animateButtonPress(startButtonScaleAnim, 1, handleFinalStartGame)} disabled={isStartingGame} style={dynamicStyles.startButtonPressableWrapper}>
                <Animated.View style={[dynamicStyles.startButton, isStartingGame && dynamicStyles.startButtonDisabled, { transform: [{scale: startButtonScaleAnim}] }]}>
                    {isStartingGame ? (<ActivityIndicator size="large" color={Colors.accentText} />) : (<Text style={dynamicStyles.startButtonText}>Starten</Text>)}
                </Animated.View>
            </Pressable>
        )}
      </View>
    </View>
  );
}
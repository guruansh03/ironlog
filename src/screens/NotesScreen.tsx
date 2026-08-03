import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { useNotesStore, Note } from '../store/notesStore';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import StaggerItem from '../components/animations/StaggerItem';
import Chip from '../components/shared/Chip';

function getNoteTags(note: Note): string[] {
  const text = `${note.title} ${note.body}`.toLowerCase();
  const tags: string[] = [];
  if (note.type === 'todo') tags.push('Todo');
  if (text.includes('workout') || text.includes('gym') || text.includes('lift')) tags.push('Workout');
  if (text.includes('meal') || text.includes('diet') || text.includes('calorie')) tags.push('Diet');
  if (text.includes('idea') || text.includes('plan') || text.includes('project')) tags.push('Ideas');
  if (text.includes('journal') || text.includes('personal') || text.includes('mood')) tags.push('Personal');
  if (!tags.length) tags.push('General');
  return [...new Set(tags)];
}

function renderInlineText(text: string, baseStyle: any, palette: { ink: string; accent: string; ink2: string }) {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*([^*]+)\*\*|_([^_]+)_|~~([^~]+)~~|==([^=]+)==|<u>(.*?)<\/u>|\[([^\]]+)\]\(([^)]+)\))/;
  let remaining = text;
  let key = 0;

  while (remaining.length) {
    const match = remaining.match(tokenRegex);
    if (!match || match.index === undefined) {
      parts.push(<Text key={`txt-${key++}`} style={baseStyle}>{remaining}</Text>);
      break;
    }

    const before = remaining.slice(0, match.index);
    if (before) {
      parts.push(<Text key={`txt-${key++}`} style={baseStyle}>{before}</Text>);
    }

    if (match[2]) {
      parts.push(<Text key={`b-${key++}`} style={[baseStyle, styles.previewBold]}>{match[2]}</Text>);
    } else if (match[3]) {
      parts.push(<Text key={`i-${key++}`} style={[baseStyle, styles.previewItalic]}>{match[3]}</Text>);
    } else if (match[4]) {
      parts.push(<Text key={`s-${key++}`} style={[baseStyle, styles.previewStrike]}>{match[4]}</Text>);
    } else if (match[5]) {
      parts.push(
        <Text
          key={`hl-${key++}`}
          style={[
            baseStyle,
            styles.previewHighlight,
            { backgroundColor: palette.accent, color: '#FFFFFF' },
          ]}
        >
          {match[5]}
        </Text>
      );
    } else if (match[6]) {
      parts.push(<Text key={`u-${key++}`} style={[baseStyle, styles.previewUnderline]}>{match[6]}</Text>);
    } else if (match[7]) {
      parts.push(
        <Text key={`l-${key++}`} style={[baseStyle, styles.previewLink, { color: palette.ink2 }]}> 
          {match[7]}
        </Text>
      );
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return parts;
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const { notes, deleteNote, togglePin, toggleTodo } = useNotesStore();

  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const searchInputRef = React.useRef<any>(null);

  function sanitizeBody(text: string) {
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '[image]')   // images
      .replace(/\n?#tags\s+#[^\n]+/g, '')         // #tags lines
      .replace(/^#{1,6}\s+/gm, '')                // strip # header markers but keep text
      .replace(/^>\s*/gm, '')                      // strip blockquote markers
      .replace(/^[-*]\s+\[[xX ]\]\s*/gm, '• ')   // todo items → bullet
      .trim();
  }

  const tagOptions = useMemo(() => {
    const tags = new Set<string>(['All']);
    notes.forEach((note) => getNoteTags(note).forEach((tag) => tags.add(tag)));
    return Array.from(tags);
  }, [notes]);

  const filtered = useMemo(() => {
    const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return sorted.filter((note) => {
      const inSearch = `${note.title} ${note.body}`.toLowerCase().includes(query.trim().toLowerCase());
      const inTag = activeTag === 'All' || getNoteTags(note).includes(activeTag);
      return inSearch && inTag;
    });
  }, [activeTag, notes, query]);

  function handleDelete(id: string) {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this note?')) deleteNote(id);
      return;
    }
    Alert.alert('Delete Note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(id) },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}> 
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 98,
          gap: 10,
        }}
        showsVerticalScrollIndicator
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={[styles.title, { color: t.ink }]}>Notes</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AnimatedPressable
                  style={[styles.headerBtn, { backgroundColor: t.surface, borderColor: t.border }]}
                  onPress={() => searchInputRef.current?.focus()}
                >
                  <Ionicons name="search-outline" size={16} color={t.ink3} />
                </AnimatedPressable>
                <AnimatedPressable
                  style={[styles.headerBtn, { backgroundColor: t.ink }]}
                  onPress={() => navigation.navigate('NoteEditorScreen')}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                </AnimatedPressable>
              </View>
            </View>

            <View style={[styles.searchBar, { backgroundColor: t.surface, borderColor: t.border }]}> 
              <Ionicons name="search" size={14} color={t.ink4} />
              <TextInput
                ref={searchInputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search notes"
                placeholderTextColor={t.ink4}
                style={[styles.searchInput, { color: t.ink }]}
              />
            </View>

            <FlatList
              horizontal
              data={tagOptions}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginBottom: 10 }}
              renderItem={({ item }) => (
                <Chip
                  label={item}
                  active={activeTag === item}
                  onPress={() => setActiveTag(item)}
                />
              )}
            />
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: t.ink }]}>No notes found</Text>
            <Text style={[styles.emptySub, { color: t.ink3 }]}>Try another tag or create a new note.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}> 
              <View style={styles.topRow}>
                <View style={styles.tagsInline}>
                  {getNoteTags(item).slice(0, 3).map((tag) => (
                    <View key={`${item.id}-${tag}`} style={[styles.tagPill, { backgroundColor: t.surface2 }]}> 
                      <Text style={[styles.tagText, { color: t.ink3 }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.actions}>
                  <AnimatedPressable onPress={() => togglePin(item.id)}>
                    <Ionicons name={item.pinned ? 'bookmark' : 'bookmark-outline'} size={16} color={t.ink3} />
                  </AnimatedPressable>
                  <AnimatedPressable onPress={() => navigation.navigate('NoteEditorScreen', { noteId: item.id })}>
                    <Ionicons name="create-outline" size={16} color={t.ink3} />
                  </AnimatedPressable>
                  <AnimatedPressable onPress={() => handleDelete(item.id)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </AnimatedPressable>
                </View>
              </View>

              <Text style={[styles.cardTitle, { color: t.ink }]} numberOfLines={1}>{item.title || 'Untitled note'}</Text>
              {item.type === 'todo' ? (
                <View style={{ gap: 6 }}>
                  {sanitizeBody(item.body || '').split('\n').filter((line) => line.trim()).map((line, lineIndex) => {
                    const checked = item.completedItems?.includes(lineIndex);
                    const cleanLine = line.replace(/^-\s*\[[xX ]\]\s*/,'').replace(/^-\s*/,'');
                    return (
                      <AnimatedPressable key={`${item.id}-${lineIndex}`} onPress={() => toggleTodo(item.id, lineIndex)} style={styles.todoRow}>
                        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={15} color={checked ? t.accentBtn : t.ink4} />
                        <Text style={[styles.cardBody, { color: checked ? t.ink3 : t.ink2, textDecorationLine: checked ? 'line-through' : 'none' }]} numberOfLines={expandedIds[item.id] ? undefined : 1}>
                          {renderInlineText(cleanLine, styles.cardBody, { ink: t.ink2, accent: t.accentBtn, ink2: t.accent })}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              ) : (
                <Text
                  style={[styles.cardBody, { color: t.ink2 }]}
                  numberOfLines={expandedIds[item.id] ? undefined : 3}
                >
                  {renderInlineText(sanitizeBody(item.body || 'No content yet'), styles.cardBody, { ink: t.ink2, accent: t.accentBtn, ink2: t.accent })}
                </Text>
              )}

              <AnimatedPressable
                onPress={() => setExpandedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                style={styles.expandBtn}
              >
                <Text style={[styles.expandText, { color: t.accent }]}> {expandedIds[item.id] ? 'Show less' : 'Show more'} </Text>
              </AnimatedPressable>

              <View style={styles.footer}>
                <Text style={[styles.footerText, { color: t.ink4 }]}>
                  {format(new Date(item.updatedAt), 'MMM d, yyyy')}
                </Text>
                <Text style={[styles.footerText, { color: t.ink4 }]}>{item.type.toUpperCase()}</Text>
              </View>
            </View>
          </StaggerItem>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: F.regular,
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  tagsInline: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  tagPill: {
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: F.medium,
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: F.bold,
    fontSize: 16,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  previewBold: {
    fontFamily: F.bold,
  },
  previewItalic: {
    fontStyle: 'italic',
  },
  previewStrike: {
    textDecorationLine: 'line-through',
  },
  previewUnderline: {
    textDecorationLine: 'underline',
  },
  previewHighlight: {
    borderRadius: 3,
    overflow: 'hidden',
  },
  previewLink: {
    textDecorationLine: 'underline',
    fontFamily: F.medium,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  footer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expandBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandText: {
    fontFamily: F.semibold,
    fontSize: 11,
  },
  footerText: {
    fontFamily: F.regular,
    fontSize: 11,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: F.semibold,
    fontSize: 16,
  },
  emptySub: {
    marginTop: 6,
    fontFamily: F.regular,
    fontSize: 13,
  },
});


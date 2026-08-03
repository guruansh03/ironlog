import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { RootStackParams } from '../navigation/RootNavigator';
import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { getReadableTextColor } from '../theme/contrast';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import { useNotesStore } from '../store/notesStore';

type RouteT = RouteProp<RootStackParams, 'NoteEditorScreen'>;

type Range = { start: number; end: number };

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
            { backgroundColor: palette.accent, color: getReadableTextColor(palette.accent) },
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

export default function NoteEditorScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteT>();
  const { theme: t } = useAppTheme();
  const { notes, addNote, updateNote } = useNotesStore();

  const existing = useMemo(() => notes.find((n) => n.id === route.params?.noteId), [notes, route.params?.noteId]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(() => {
    // Strip existing #tags line so it doesn't duplicate on save
    const raw = existing?.body ?? '';
    return raw.replace(/\n*#tags\s+.*$/m, '').trimEnd();
  });
  const [selection, setSelection] = useState<Range>({ start: 0, end: 0 });
  const [activeTags, setActiveTags] = useState<string[]>(() => {
    if (existing?.body) {
      const tagMatch = existing.body.match(/#tags\s+(.*?)$/m);
      if (tagMatch) {
        return tagMatch[1].split(/\s+/).map((t: string) => t.replace(/^#/, '')).filter(Boolean);
      }
    }
    return ['training', 'ideas'];
  });
  const [noteType, setNoteType] = useState<'note' | 'todo'>(existing?.type ?? 'note');
  const [editorView, setEditorView] = useState<'edit' | 'preview'>('edit');
  const bodyInputRef = useRef<TextInput>(null);
  const onAccent = getReadableTextColor(t.accentBtn);
  const onInk = getReadableTextColor(t.ink);

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const chars = body.length;

  function onSelectionChange(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) {
    setSelection(event.nativeEvent.selection);
  }

  function applyWrapper(prefix: string, suffix = prefix) {
    const { start, end } = selection;
    setEditorView('edit');
    if (start === end) {
      setBody((prev) => `${prev.slice(0, start)}${prefix}${suffix}${prev.slice(start)}`);
      const cursor = start + prefix.length;
      setSelection({ start: cursor, end: cursor });
      requestAnimationFrame(() => bodyInputRef.current?.focus());
      return;
    }
    setBody((prev) => `${prev.slice(0, start)}${prefix}${prev.slice(start, end)}${suffix}${prev.slice(end)}`);
    setSelection({ start: start + prefix.length, end: end + prefix.length });
    requestAnimationFrame(() => bodyInputRef.current?.focus());
  }

  function applyPrefix(prefix: string) {
    const { start } = selection;
    setEditorView('edit');
    setBody((prev) => `${prev.slice(0, start)}${prefix}${prev.slice(start)}`);
    const cursor = start + prefix.length;
    setSelection({ start: cursor, end: cursor });
    requestAnimationFrame(() => bodyInputRef.current?.focus());
  }

  async function handleSave() {
    if (!title.trim() && !body.trim()) {
      navigation.goBack();
      return;
    }

    const finalBody = activeTags.length ? `${body}\n\n#tags ${activeTags.map((tag) => `#${tag}`).join(' ')}` : body;
    if (existing) {
      await updateNote(existing.id, { title: title.trim(), body: finalBody.trim() });
    } else {
      await addNote(title.trim(), finalBody.trim(), noteType);
    }
    navigation.goBack();
  }

  const tools = [
    { label: 'B', onPress: () => applyWrapper('**') },
    { label: 'I', onPress: () => applyWrapper('_') },
    { label: 'U', onPress: () => applyWrapper('<u>', '</u>') },
    { label: 'S', onPress: () => applyWrapper('~~') },
    { label: 'H1', onPress: () => applyPrefix('\n# ') },
    { label: 'H2', onPress: () => applyPrefix('\n## ') },
    { label: '•', onPress: () => applyPrefix('\n- ') },
    { label: '☑', onPress: () => applyPrefix('\n- [ ] ') },
    { label: '🔗', onPress: () => applyWrapper('[', '](https://)') },
    { label: '🖼', onPress: () => applyPrefix('\n![image](https://)') },
    { label: '⭐', onPress: () => applyWrapper('==', '==') },
  ];

  const availableTags = ['training', 'ideas', 'workout', 'diet', 'todo', 'journal', 'goals'];

  function renderPreviewBody(content: string) {
    return (content || 'Nothing to preview yet.').split('\n').map((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return <View key={`empty-${index}`} style={{ height: 10 }} />;
      }

      if (trimmed.startsWith('# ')) {
        return (
          <Text key={`h1-${index}`} style={[styles.previewH1, { color: t.ink }]}> 
            {renderInlineText(trimmed.slice(2), undefined, { ink: t.ink, accent: t.accent, ink2: t.ink2 })}
          </Text>
        );
      }

      if (trimmed.startsWith('## ')) {
        return (
          <Text key={`h2-${index}`} style={[styles.previewH2, { color: t.ink }]}> 
            {renderInlineText(trimmed.slice(3), undefined, { ink: t.ink, accent: t.accent, ink2: t.ink2 })}
          </Text>
        );
      }

      if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
        const checked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
        const text = trimmed.replace(/^- \[[xX ]\] /, '');
        return (
          <View key={`todo-${index}`} style={styles.previewTodoRow}>
            <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={16} color={checked ? t.accentBtn : t.ink4} />
            <Text style={[styles.previewText, { color: checked ? t.ink3 : t.ink }]}> 
              {renderInlineText(text, styles.previewText, { ink: t.ink, accent: t.accent, ink2: t.ink2 })}
            </Text>
          </View>
        );
      }

      if (trimmed.startsWith('- ')) {
        return (
          <View key={`bullet-${index}`} style={styles.previewTodoRow}>
            <Text style={[styles.previewBullet, { color: t.ink3 }]}>•</Text>
            <Text style={[styles.previewText, { color: t.ink }]}> 
              {renderInlineText(trimmed.slice(2), styles.previewText, { ink: t.ink, accent: t.accent, ink2: t.ink2 })}
            </Text>
          </View>
        );
      }

      return (
        <Text key={`p-${index}`} style={[styles.previewText, { color: t.ink }]}> 
          {renderInlineText(trimmed, styles.previewText, { ink: t.ink, accent: t.accent, ink2: t.ink2 })}
        </Text>
      );
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}> 
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: t.border }]}> 
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.topBtn}>
          <Ionicons name="chevron-back" size={20} color={t.ink} />
        </AnimatedPressable>

        <View style={styles.topCenter}>
          <View style={[styles.folderPill, { backgroundColor: t.surface2 }]}> 
            <Text style={[styles.folderText, { color: t.ink3 }]}>Notes</Text>
          </View>
          <Text style={[styles.topMeta, { color: t.ink4 }]}>{words} words · {format(new Date(), 'MMM d')}</Text>
        </View>

        <AnimatedPressable onPress={handleSave} style={styles.topBtn}>
          <Ionicons name="checkmark" size={22} color={t.accentBtn} />
        </AnimatedPressable>
      </View>

      <ScrollView showsVerticalScrollIndicator contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}> 
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbar}> 
          {tools.map((tool) => (
            <AnimatedPressable key={tool.label} onPress={tool.onPress} style={[styles.toolBtn, { backgroundColor: t.surface, borderColor: t.border }]}> 
              <Text style={[styles.toolText, { color: t.ink3 }]}>{tool.label}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        <View style={styles.modeRow}>
          {(['edit', 'preview'] as const).map((mode) => {
            const active = editorView === mode;
            return (
              <AnimatedPressable
                key={mode}
                onPress={() => setEditorView(mode)}
                style={[styles.modeBtn, { backgroundColor: active ? t.ink : t.surface2 }]}
              >
                <Text style={[styles.modeText, { color: active ? onInk : t.ink3 }]}>{mode.toUpperCase()}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {!existing && (
          <View style={styles.modeRow}>
            {(['note', 'todo'] as const).map((mode) => {
              const active = noteType === mode;
              return (
                <AnimatedPressable
                  key={mode}
                  onPress={() => setNoteType(mode)}
                  style={[styles.modeBtn, { backgroundColor: active ? t.accentBtn : t.surface2 }]}
                >
                  <Text style={[styles.modeText, { color: active ? onAccent : t.ink3 }]}>{mode.toUpperCase()}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        )}

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={t.ink4}
          style={[styles.titleInput, { color: t.ink }]}
        />

        <View style={styles.tagsRow}>
          {availableTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <AnimatedPressable
                key={tag}
                onPress={() => setActiveTags((prev) => (active ? prev.filter((x) => x !== tag) : [...prev, tag]))}
                style={[styles.tagPill, { backgroundColor: active ? t.accentBtn : t.surface2 }]}
              >
                <Text style={[styles.tagText, { color: active ? onAccent : t.ink3 }]}>{tag}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {editorView === 'edit' ? (
          <>
            <TextInput
              ref={bodyInputRef}
              value={body}
              onChangeText={setBody}
              onSelectionChange={onSelectionChange}
              selection={selection}
              placeholder="Write your note..."
              placeholderTextColor={t.ink4}
              multiline
              blurOnSubmit={false}
              style={[styles.bodyInput, { color: t.ink }]}
            />

            <Text style={[styles.livePreviewLabel, { color: t.ink4 }]}>Live Preview</Text>
            <View style={[styles.previewBox, { backgroundColor: t.surface, borderColor: t.border }]}> 
              {renderPreviewBody(body)}
            </View>
          </>
        ) : (
          <View style={[styles.previewBox, { backgroundColor: t.surface, borderColor: t.border }]}> 
            {renderPreviewBody(body)}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: t.border, backgroundColor: t.bg }]}> 
        <Text style={[styles.footerText, { color: t.ink3 }]}>{words} words</Text>
        <Text style={[styles.footerText, { color: t.ink3 }]}>{chars} chars</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    alignItems: 'center',
    gap: 6,
  },
  folderPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  folderText: {
    fontFamily: F.semibold,
    fontSize: 11,
  },
  topMeta: {
    fontFamily: F.regular,
    fontSize: 11,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  toolbar: {
    gap: 8,
  },
  toolBtn: {
    borderWidth: 1,
    borderRadius: 12,
    height: 34,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  toolText: {
    fontFamily: F.semibold,
    fontSize: 12,
  },
  titleInput: {
    fontFamily: F.bold,
    fontSize: 26,
    letterSpacing: -0.4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeText: {
    fontFamily: F.semibold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  tagPill: {
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: {
    fontFamily: F.medium,
    fontSize: 11,
  },
  bodyInput: {
    minHeight: 380,
    fontFamily: F.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  livePreviewLabel: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 2,
    marginHorizontal: 2,
  },
  previewBox: {
    minHeight: 380,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  previewH1: {
    fontFamily: F.bold,
    fontSize: 24,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  previewH2: {
    fontFamily: F.semibold,
    fontSize: 20,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  previewText: {
    fontFamily: F.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  previewTodoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  previewBullet: {
    fontFamily: F.bold,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 1,
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
    borderRadius: 4,
    overflow: 'hidden',
  },
  previewLink: {
    textDecorationLine: 'underline',
    fontFamily: F.medium,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontFamily: F.medium,
    fontSize: 12,
  },
});


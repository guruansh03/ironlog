import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, TextInput, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

function fuzzyScore(text: string, query: string) {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  if (t.startsWith(q)) return 200 - (t.length - q.length);
  if (t.includes(q)) return 120 - (t.indexOf(q));

  let ti = 0;
  let score = 0;
  for (let qi = 0; qi < q.length; qi += 1) {
    const ch = q[qi];
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    score += Math.max(1, 8 - (found - ti));
    ti = found + 1;
  }
  return score;
}

interface Props {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  icon?: string;
}

export default function DropdownPicker({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select',
  searchable = false,
  icon,
}: Props) {
  const { colors: c, neu } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = searchable && search
    ? options
        .map((option) => ({ option, score: fuzzyScore(option, search) }))
        .filter((item) => item.score >= 0)
        .sort((a, b) => b.score - a.score || a.option.localeCompare(b.option))
        .map((item) => item.option)
    : options;

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, neu.darkShadowSm, { backgroundColor: c.card }]}
        onPress={() => { setOpen(true); setSearch(''); }}
        activeOpacity={0.8}
      >
        {icon && (
          <Ionicons name={icon as any} size={16} color={c.textMuted} style={{ marginRight: 6 }} />
        )}
        <Text
          style={[styles.triggerText, { color: value ? c.text : c.textMuted }]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={c.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.bg }]}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.text }]}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={[styles.closeBtn, { backgroundColor: c.cardAlt }]}>
                <Ionicons name="close" size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            {searchable && (
              <View style={[styles.searchWrap, neu.insetShadow, { backgroundColor: c.cardAlt }]}>
                <Ionicons name="search-outline" size={16} color={c.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: c.text }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor={c.textMuted}
                  autoFocus
                />
              </View>
            )}

            {/* Options list */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              style={styles.list}
              showsVerticalScrollIndicator
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.cardAlt }]} />}
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      selected && styles.optionSelected,
                    ]}
                    onPress={() => { onSelect(item); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText, 
                      { color: selected ? c.text : c.textSub },
                      selected && styles.optionTextSelected
                    ]}>
                      {item}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={18} color={c.text} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No results</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 4,
  },
  triggerText: {
    flex: 1,
    fontSize: FONT.md,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: FONT.lg,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT.md,
    padding: 0,
  },
  list: {
    flexGrow: 0,
  },
  separator: {
    height: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  optionSelected: {},
  optionText: {
    fontSize: FONT.base,
    fontWeight: '500',
  },
  optionTextSelected: {
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FONT.md,
    paddingVertical: 24,
  },
});


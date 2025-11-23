/**
 * Simple Markdown Text Component
 * Renders basic markdown formatting for AI responses
 */
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { theme } from '../theme';

const MarkdownText = ({ children, style }) => {
  if (!children) return null;

  const parseMarkdown = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let key = 0;

    lines.forEach((line, lineIndex) => {
      // Bold text: **text**
      const boldRegex = /\*\*(.+?)\*\*/g;
      // Italic text: *text*
      const italicRegex = /\*(.+?)\*/g;
      // Bullet points: • or - at start
      const bulletRegex = /^[•\-]\s+(.+)/;
      // Numbered lists: 1. text
      const numberedRegex = /^(\d+)\.\s+(.+)/;

      if (bulletRegex.test(line)) {
        // Bullet point
        const match = line.match(bulletRegex);
        elements.push(
          <View key={key++} style={styles.bulletContainer}>
            <Text style={[styles.bullet, style]}>• </Text>
            <Text style={[styles.text, style]}>{formatInlineMarkdown(match[1])}</Text>
          </View>
        );
      } else if (numberedRegex.test(line)) {
        // Numbered list
        const match = line.match(numberedRegex);
        elements.push(
          <View key={key++} style={styles.bulletContainer}>
            <Text style={[styles.bullet, style]}>{match[1]}. </Text>
            <Text style={[styles.text, style]}>{formatInlineMarkdown(match[2])}</Text>
          </View>
        );
      } else if (line.trim() === '') {
        // Empty line - add spacing
        elements.push(<View key={key++} style={styles.spacing} />);
      } else {
        // Regular paragraph
        elements.push(
          <Text key={key++} style={[styles.text, style]}>
            {formatInlineMarkdown(line)}
            {lineIndex < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }
    });

    return elements;
  };

  const formatInlineMarkdown = (text) => {
    const parts = [];
    let lastIndex = 0;
    let key = 0;

    // Match bold **text**
    const boldRegex = /\*\*(.+?)\*\*/g;
    let match;

    const processedText = text.replace(boldRegex, (match, content) => {
      return `__BOLD__${content}__BOLD__`;
    });

    // Split by bold markers and render
    const segments = processedText.split('__BOLD__');
    segments.forEach((segment, index) => {
      if (index % 2 === 0) {
        // Regular text
        if (segment) {
          parts.push(
            <Text key={key++} style={style}>
              {segment}
            </Text>
          );
        }
      } else {
        // Bold text
        parts.push(
          <Text key={key++} style={[style, styles.bold]}>
            {segment}
          </Text>
        );
      }
    });

    return parts.length > 0 ? parts : text;
  };

  return <View style={styles.container}>{parseMarkdown(children)}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textPrimary,
  },
  bold: {
    fontWeight: theme.typography.fontWeight.bold,
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    marginRight: 4,
  },
  spacing: {
    height: 8,
  },
});

export default MarkdownText;

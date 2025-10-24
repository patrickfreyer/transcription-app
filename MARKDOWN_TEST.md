# Markdown Rendering Test Document

This document can be used to test the markdown rendering implementation.

## How to Test

1. **In Chat**: Send a question to the AI and observe formatted responses
2. **In Summaries**: Generate a summary with markdown formatting and view it

## Example Test Cases

### Basic Formatting

**Bold text**
*Italic text*
~~Strikethrough text~~

### Lists

**Bullet List:**
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

**Numbered List:**
1. First step
2. Second step
3. Third step

### Code

**Inline code:** Use `const result = await api.call()` for async operations.

**Code block:**
```javascript
function transcribe(audio) {
  const result = await openai.audio.transcriptions.create({
    file: audio,
    model: "whisper-1"
  });
  return result.text;
}
```

```python
def analyze_transcript(text):
    """Analyze transcript content"""
    keywords = extract_keywords(text)
    summary = generate_summary(text)
    return {"keywords": keywords, "summary": summary}
```

### Links

- [OpenAI Documentation](https://platform.openai.com/docs)
- [GitHub](https://github.com)
- [Claude Code](https://claude.com/claude-code)

### Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Transcription | ✅ Complete | High |
| Chat | ✅ Complete | High |
| Markdown | ✅ Complete | Medium |

### Blockquotes

> "The best way to predict the future is to invent it."
> - Alan Kay

### Horizontal Rule

---

### Task Lists

- [x] Install markdown dependencies
- [x] Create MarkdownRenderer component
- [x] Integrate in ChatMessages
- [x] Integrate in Summaries
- [x] Add external link handler
- [x] Test build
- [ ] Manual testing in app

## Expected Behavior

### In Chat Messages (Assistant responses):
- ✅ Headings should be styled appropriately (smaller in compact mode)
- ✅ Code blocks should have syntax highlighting
- ✅ Links should open externally in system browser
- ✅ Tables should render with borders
- ✅ Lists should be properly indented
- ✅ Inline code should have background color

### In Summary View:
- ✅ Full markdown styling (larger headings)
- ✅ All markdown features supported
- ✅ Code highlighting enabled
- ✅ External link handling

### Security:
- ✅ XSS attacks blocked (HTML tags rendered as text)
- ✅ JavaScript URLs blocked
- ✅ Only http:// and https:// links allowed

## XSS Test Cases (Should be safe)

These should render as plain text, NOT execute:

```
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
[Click me](javascript:alert('XSS'))
```

## Sample AI Summary (Markdown Format)

# Meeting Summary

## Key Decisions
- Approved Q4 budget of $2.5M
- Hired 3 new engineers for AI team
- Launched beta testing program

## Action Items
1. **Sarah**: Prepare Q4 roadmap by Friday
2. **John**: Schedule follow-up with investors
3. **Team**: Complete security audit by end of month

## Discussion Points
The team discussed several important topics:

- **Product Launch**: On track for December release
- **Customer Feedback**: Generally positive, minor UI improvements needed
- **Competition**: New competitor entered market last week

### Technical Details
```
Infrastructure costs: $45K/month
Active users: 12,500
MRR growth: +23% MoM
```

> "We're making excellent progress. Keep up the great work!"
> - CEO

---

**Next Meeting**: November 1st @ 10am PT

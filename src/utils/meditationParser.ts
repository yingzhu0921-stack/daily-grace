export const parseTemplate = (text: string) => {
  const lines = text.split('\n');
  let title = '';
  let passage = '';
  let application = '';
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '제목' || line === '# 제목') {
      currentSection = 'title';
      continue;
    } else if (line === '본문' || line === '## 본문') {
      currentSection = 'passage';
      continue;
    } else if (line === '적용' || line === '## 적용') {
      currentSection = 'application';
      continue;
    }

    if (line && !line.startsWith('(') && !line.endsWith(')')) {
      if (currentSection === 'title') {
        title += line + '\n';
      } else if (currentSection === 'passage') {
        passage += line + '\n';
      } else if (currentSection === 'application') {
        application += line + '\n';
      }
    }
  }

  return {
    title: title.trim(),
    passage: passage.trim(),
    application: application.trim()
  };
};

export const getDefaultTemplate = () => {
  return `# 제목
(제목을 적어주세요)

## 본문
(오늘 읽은 말씀 혹은 묵상 내용을 적어주세요)

## 적용
(오늘 내가 실천할 한 가지를 써보세요)`;
};

/** 富文本解析器 */

/** 富文本节点 */
export interface RichTextNode {
  type: 'text' | 'bold' | 'italic' | 'color' | 'icon';
  content: string;
  style?: Record<string, string>;
}

/** 富文本解析器 */
export class RichTextParser {
  /** 解析富文本为节点数组 */
  static parse(text: string): RichTextNode[] {
    const nodes: RichTextNode[] = [];
    // 使用正则解析标记格式: [b]粗体[/b], [i]斜体[/i], [color=#xxx]颜色[/color], [icon]图标名[/icon]
    const regex = /\[(\/?)(b|i|color(?:=([^\]]+))?|icon(?::([^\]]+))?)\]([^\[]*)/g;
    
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(text)) !== null) {
      // 添加之前的纯文本
      if (match.index > lastIndex) {
        nodes.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      
      const isClosing = match[1] === '/';
      const tagName = match[2].split('=')[0];
      const content = match[5] || '';
      
      if (!isClosing && content) {
        const node: RichTextNode = { type: 'text', content };
        
        switch (tagName) {
          case 'b': node.type = 'bold'; break;
          case 'i': node.type = 'italic'; break;
          case 'color': 
            node.type = 'color';
            node.style = { color: match[3] || '#000' };
            break;
          case 'icon':
            node.type = 'icon';
            break;
        }
        
        nodes.push(node);
      }
      
      lastIndex = regex.lastIndex;
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      nodes.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    return nodes;
  }
}

/** 快捷解析函数 */
export function parseRichText(text: string): RichTextNode[] {
  return RichTextParser.parse(text);
}

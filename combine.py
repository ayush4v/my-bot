import os

bot_dir = r"c:\Users\ayush\OneDrive\Desktop\bot"
with open(os.path.join(bot_dir, "index.html"), "r", encoding="utf-8") as f:
    html = f.read()

with open(os.path.join(bot_dir, "ultra.css"), "r", encoding="utf-8") as f:
    css = f.read()

with open(os.path.join(bot_dir, "ultra.js"), "r", encoding="utf-8") as f:
    js = f.read()

html = html.replace('<link rel="stylesheet" href="ultra.css?v=4.5.3">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="ultra.js?v=4.5.3"></script>', '<script>\n' + js + '\n</script>')

with open(os.path.join(bot_dir, "combined_bot.html"), "w", encoding="utf-8") as f:
    f.write(html)
print("Successfully combined!")

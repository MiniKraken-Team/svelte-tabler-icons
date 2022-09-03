import * as fs from 'fs';
import * as path from 'path';
String.prototype.toPascalCase = function () {
    return (this.match(/[a-zA-Z0-9]+/g) || [])
        .map(function (w) { return "".concat(w.charAt(0).toUpperCase()).concat(w.slice(1)); })
        .join('');
};
function generateIcons() {
    var svgContentMatcher = /<svg[^>]*>([\s\S]*?)<\/svg>/;
    var tablerFolderPath = path.resolve('./node_modules/@tabler/icons/icons');
    var iconFolderPath = path.resolve('./icons');
    var indexFilePath = path.resolve('./index.js');
    var indexTypeFilePath = path.resolve('./index.d.ts');
    // get template
    var svelteTemplateContent = fs
        .readFileSync(path.resolve('./src/template/Icon.svelte'))
        .toString();
    // clear index file
    fs.writeFileSync(indexFilePath, '');
    // clear index typescript declaration file
    fs.writeFileSync(indexTypeFilePath, "import { SvelteComponentTyped } from 'svelte';");
    // get all icons from tabler package
    var files = fs.readdirSync(tablerFolderPath);
    files.forEach(function (file) {
        var name = "Icon-".concat(file.slice(0, -4).toPascalCase());
        var fileContent = fs.readFileSync("".concat(tablerFolderPath, "/").concat(file)).toString();
        // fill in template + minify the svg a bit
        var transformedContent = svelteTemplateContent
            .replace('$$SVG_CONTENT', fileContent.match(svgContentMatcher)[1].replace(/(?:\r\n|\r|\n)/g, ''))
            .replace('$$SVG_ARIA_LABEL', name);
        // create svelte file
        fs.writeFileSync("".concat(iconFolderPath, "/").concat(name, ".svelte"), transformedContent);
        // append to index file
        fs.appendFileSync(indexFilePath, "export { default as ".concat(name.replace('-', ''), " } from './icons/").concat(name, ".svelte'\n"));
        // append index
        fs.appendFileSync(path.resolve('./index.d.ts'), "\nexport class ".concat(name.replace('-', ''), " extends SvelteComponentTyped<{\n  size?: string | number\n  color?: string\n  ariaLabel?: string\n  strokeWidth?: string | number\n  fillColor?: string\n}> {}"));
    });
}
export default generateIcons();

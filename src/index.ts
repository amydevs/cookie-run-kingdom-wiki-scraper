import fs from 'fs';
import path from 'path';
import process from 'process';
import { Scraper, Types } from "./modules/scraper"
  
(async () => {
    const basePath = path.join('.', 'scraper_output');
    const assetsPath = path.join(basePath, 'assets');
    // fs stuff
    if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath);
    }
    if (!fs.existsSync(assetsPath)) {
        fs.mkdirSync(assetsPath);
    }
    console.log(`Output Directory: ${path.resolve(basePath)}`);

    // start of scraper
    const scraper = new Scraper();
    const allCharactersUrls = await scraper.getCharactersUrls();
    console.log(`Getting Info for ${allCharactersUrls.length} Cookies`);
    const allCharacters: Types.Character[] = [];
    for (const index in allCharactersUrls) {
        const i = Number(index);
        const character = await scraper.getCharacter(allCharactersUrls[i]);
        process.stdout.write(`\r\x1b[K${(((i+1)/allCharactersUrls.length)*100).toFixed(1)}% Done | Cookie ${i+1} of ${allCharactersUrls.length} | ${character.name}`);

        // debug
        if (i == 4) {break}
        
        //download
        const filePath = path.join(assetsPath, `${character.name}.png`);
        await scraper.download(character.imagePath, filePath);
        character.imagePath = `./${path.relative(basePath, filePath).replace(/\\/g, '/')}`;

        allCharacters.push(character);
        
    }
    process.stdout.write(`\n`);

    require('fs').writeFile(
        path.join(basePath, 'cookies.json'),
        JSON.stringify(allCharacters, null, 2),
        
        function (err:Error) {
            if (err) {
                console.error('Error');
            }
        }
    );
    console.log("Done!");
})();



 
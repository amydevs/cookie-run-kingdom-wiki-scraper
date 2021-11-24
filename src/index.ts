import fs from 'fs';
import path from 'path';
import process from 'process';

import axios, { Axios, AxiosInstance } from 'axios';
import cheerio from 'cheerio';

export namespace Types {
    
    export interface Character {
        name: string
        type: CharacterType
        imagePath: string
        probability: number
        rarity: CharacterRarity
    }
    
    export type CharacterType = 'Ambush' | 'Bomber' | 'Charge' | 'Defense' | 'Healing' | 'Magic' | 'Ranged' | 'Support';
    // enum CharacterType {
    //     Ambush,
    //     Bomber,
    //     Charge,
    //     Defense,
    //     Healing,
    //     Magic,
    //     Ranged,
    //     Support
    // }
    
    export type CharacterRarity = 'Special' | 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Ancient';

    export function getProbabilityFromRarity(rarity: CharacterRarity): number {
        switch (rarity) {
            default:
            case 'Special':
                return 0;
                break;
            case 'Common':
                return 0.4197;
                break;
            case 'Rare':
                return 0.3766;
                break;
            case 'Epic':
                return 0.1929;
                break;
            case 'Legendary':
                return 0.0036;
                break;
            case 'Ancient':
                return 0.0072;
                break;
        }
    }
    // export enum CharacterRarity {
    //     Special = 0.00,
    //     Common = 0.4197,
    //     Rare = 0.3766,
    //     Epic = 0.1929,
    //     Legendary = 0.0036,
    //     Ancient = 0.0072
    // }
}

export class Scraper {
    baseUrl: string;
    axiosInst: AxiosInstance;
    constructor() {
        this.baseUrl = 'https://cookierunkingdom.fandom.com'; // URL we're scraping
        this.axiosInst = axios.create(); // Create a new Axios Instance
    }
    async getCharactersUrls(): Promise<string[]> {
        const $ = cheerio.load((await this.axiosInst.get(`${this.baseUrl}/wiki/List_of_Cookies`)).data);
        const allCharacersUrls: string[] = [];
        $('.wikitable > tbody th > a:not(.image)').each((_, row) =>{
            const url = $(row).attr('href');
            if (url) { allCharacersUrls.push(url); }
        }) 
        return allCharacersUrls;
    }
    async getCharacter(url: string): Promise<Types.Character> {
        const $ = cheerio.load((await this.axiosInst.get(`${this.baseUrl}${url}`)).data);
        const character:Types.Character = {
            name: $(".page-header__title#firstHeading").text().replace(/\t|\n/g, ''),
            type: $("[data-source='role']").children().last().text() as Types.CharacterType,
            imagePath: $(".pi-image-thumbnail").attr('src')?.replace(/\/revision\/.*/, "") || '',
            rarity: $("[data-source='rarity'] img").attr('alt')?.replace(/"/g, '') as Types.CharacterRarity,
            probability: Types.getProbabilityFromRarity($("[data-source='rarity'] img").attr('alt')?.replace(/"/g, '') as Types.CharacterRarity)
        };
        return character;
    }
}

async function download (url:string, filepath:string): Promise<boolean> {  
    const writer = fs.createWriteStream(path.resolve(filepath))
  
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    })
  
    response.data.pipe(writer)
  
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
}
  

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
    console.log(path.resolve(basePath));

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
        // if (i == 4) {break}
        
        //download
        const filePath = path.join(assetsPath, `${character.name}.png`);
        await download(character.imagePath, filePath);
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



 
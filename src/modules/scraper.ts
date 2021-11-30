import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import axios, { Axios, AxiosInstance } from 'axios';

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
            position: $("td[data-source='position']").text() as Types.CharacterPos
        };
        return character;
    }
    async download (url:string, filepath:string): Promise<boolean> {  
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
}

export namespace Types {
    
    export interface Character {
        name: string;
        type: CharacterType | null;
        imagePath: string;
        rarity: CharacterRarity | null;
        position: CharacterPos | null;
    }
    
    export type CharacterPos = "Rear" | "Middle" | "Front";

    export type CharacterType =
    | "Ambush"
    | "Bomber"
    | "Charge"
    | "Defense"
    | "Healing"
    | "Magic"
    | "Ranged"
    | "Support";
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
    
    export type CharacterRarity =
    | "Special"
    | "Common"
    | "Rare"
    | "Epic"
    | "Legendary"
    | "Ancient";


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
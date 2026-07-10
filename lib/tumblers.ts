export type Tumbler = {
  id: string;
  label: string;
  imageSrc?: string;
  colour: string;
  colourKo: string;
  ml: string;
  stock: number;
};

export const TUMBLERS: Tumbler[] = [
  { id: "1",  label: "Option 1",  colour: "Purple",     colourKo: "퍼플",       ml: "450ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/1.png" },
  { id: "2",  label: "Option 2",  colour: "Yellow",     colourKo: "옐로우",     ml: "450ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/2.png" },
  { id: "3",  label: "Option 3",  colour: "Ivory",      colourKo: "아이보리",   ml: "450ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/3.png" },
  { id: "4",  label: "Option 4",  colour: "White",      colourKo: "화이트",     ml: "500ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/4.png" },
  { id: "5",  label: "Option 5",  colour: "Blue",       colourKo: "블루",       ml: "500ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/5.png" },
  { id: "6",  label: "Option 6",  colour: "Pink",       colourKo: "핑크",       ml: "500ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/6.png" },
  { id: "7",  label: "Option 7",  colour: "Pink",       colourKo: "핑크",       ml: "500ml", stock: 15, imageSrc: "/giveaway/2026/tumbler/7.png" },
  { id: "8",  label: "Option 8",  colour: "Mint",       colourKo: "민트",       ml: "500ml", stock: 15, imageSrc: "/giveaway/2026/tumbler/8.png" },
  { id: "9",  label: "Option 9",  colour: "White",      colourKo: "화이트",     ml: "500ml", stock: 15, imageSrc: "/giveaway/2026/tumbler/9.png" },
  { id: "10", label: "Option 10", colour: "Black",      colourKo: "블랙",       ml: "500ml", stock: 15, imageSrc: "/giveaway/2026/tumbler/10.png" },
  { id: "11", label: "Option 11", colour: "Mint Green", colourKo: "민트그린",   ml: "550ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/11.png" },
  { id: "12", label: "Option 12", colour: "Baby Pink",  colourKo: "베이비 핑크", ml: "550ml", stock: 5,  imageSrc: "/giveaway/2026/tumbler/12.png" },
  { id: "13", label: "Option 13", colour: "White",      colourKo: "화이트",     ml: "550ml", stock: 5,  imageSrc: "/giveaway/2026/tumbler/13.png" },
  { id: "14", label: "Option 14", colour: "Black",      colourKo: "블랙",       ml: "550ml", stock: 10, imageSrc: "/giveaway/2026/tumbler/14.png" },
];

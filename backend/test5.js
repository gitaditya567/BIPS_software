const feeHead = "April ==> Transport (Shahpur Majhigawan): 630 || Tuition Fee: 1000";
const parts = feeHead.split('==>');
if (parts.length > 1) {
    const heads = parts[1].split('||');
    const transportHead = heads.find(h => h.toLowerCase().includes('transport') || h.toLowerCase().includes('bus'));
    if (transportHead) {
        console.log("transportHead:", transportHead);
        const match = transportHead.match(/(?:Transport|Bus)\s*(?:\((.*?)\))?:\s*(\d+)/i);
        if (match) {
            console.log("Stop Name:", match[1] ? match[1].trim() : 'N/A');
            console.log("Fare:", Number(match[2]));
        }
    }
}

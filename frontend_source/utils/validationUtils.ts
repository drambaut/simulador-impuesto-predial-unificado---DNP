export const isValidMobileNumber = (value: any): boolean => {
    // Convertir el valor a una cadena (en caso de que sea un número)
    const strValue = String(value);

    // Verificar longitud, primer dígito y si contiene solo dígitos
    return strValue.length === 10 &&
        strValue.startsWith('3') &&
        /^\d+$/.test(strValue);
};

export const arraysContainSameElements = (arr1: any[], arr2: any[]): boolean => {
    if (arr1.length !== arr2.length) {
      return false;
    }
  
    const sortedArr1 = [...arr1].sort();
    const sortedArr2 = [...arr2].sort();
  
    for (let i = 0; i < sortedArr1.length; i++) {
      const header1 = sortedArr1[i].trim();
      const header2 = sortedArr2[i].trim();
      if (header1 !== header2) {
        return false;
      }
    }
  
    return true;
  };

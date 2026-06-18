import axios from 'axios';

// Unified function to send data to any endpoint
export async function sendData(dto: any) {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API}/store-data`, dto, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error storing data: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

  export async function getAggregates(dataId: string) {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API}/retrieve-data/aggregates`, {
        params: {
          dataId,
        },
      }); 
      return response.data;
    } catch (error) {
      console.error(`Error storing data: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

  export async function getDestinations(dataId: string, type: string) {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API}/retrieve-data/destinations`, {
        params: {
          dataId,
          type
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error storing data: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

  export async function getStratum(dataId: string, type: string) {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API}/retrieve-data/stratum`, {
        params: {
          dataId,
          type
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error storing data: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

  export async function getTariffScenario(dto: any, type: string) {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API}/calculate/tariff/${type}`, dto, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error getting tariff data: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

  export async function calculateBaseLiquidationRequest(dataId: string, coefficient: number) {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API}/calculate/liquidation/base`, {
        params: {
          dataId,
          coefficient,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error calculating liquidation: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

  export async function calculateProjectedLiquidationRequest(dataId: string, inflation: number, smmlv: number) {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API}/calculate/liquidation/projected`, {
        params: {
          dataId,
          inflation,
          smmlv
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error calculating liquidation: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

  export async function getDashboardData(dataId: string) {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API}/calculate/liquidation/${dataId}`);
      return response.data;
    } catch (error) {
      console.error(`Error calculating liquidation: ${error}`);
      throw error; // Throw error to propagate it
    }
  }

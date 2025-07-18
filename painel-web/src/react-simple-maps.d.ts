declare module 'react-simple-maps' {
  import { ComponentType } from 'react';

  export interface ComposableMapProps {
    projection?: string;
    width?: number;
    height?: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotation?: [number, number, number];
    };
  }

  export interface GeographiesProps {
    geography: string | object;
    children: (geography: GeographyType) => React.ReactNode;
  }

  export interface GeographyType {
    geographies: Array<{
      rsmKey: string;
      properties: {
        [key: string]: any;
        NAME?: string;
        NAME_1?: string;
        SIGLA?: string;
        name?: string;
        NM_UF?: string;
        sigla?: string;
        UF?: string;
        ISO_A2?: string;
      };
      geometry: {
        coordinates: number[][][];
        type: string;
      };
    }>;
  }

  export interface GeographyProps {
    geography: {
      rsmKey: string;
      properties: {
        [key: string]: any;
        NAME?: string;
        NAME_1?: string;
        SIGLA?: string;
        name?: string;
        NM_UF?: string;
        sigla?: string;
        UF?: string;
        ISO_A2?: string;
      };
      geometry: {
        coordinates: number[][][];
        type: string;
      };
    };
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
    onClick?: (event: React.MouseEvent) => void;
    children?: React.ReactNode;
  }

  export interface ZoomableGroupProps {
    zoom?: number;
    center?: [number, number];
    translateExtent?: [[number, number], [number, number]];
    scaleExtent?: [number, number];
    minZoom?: number;
    maxZoom?: number;
    children?: React.ReactNode;
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
  }

  export interface MarkerProps {
    coordinates: [number, number];
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    r?: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  export const ComposableMap: ComponentType<ComposableMapProps>;
  export const Geographies: ComponentType<GeographiesProps>;
  export const Geography: ComponentType<GeographyProps>;
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>;
  export const Marker: ComponentType<MarkerProps>;
} 
import React, { useEffect, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { routePosition } from "../services/tracking";
import { Route } from "../types";
import { C, Icon } from "./ui";
export function RouteMap({
  route,
  progress,
  reverse = false,
}: {
  route: Route;
  progress: number;
  reverse?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const points = reverse ? [...route.stops].reverse() : route.stops;
  const [v] = useState(() => new Animated.Value(progress));
  const [p, setP] = useState(progress);
  useEffect(() => {
    const id = v.addListener(({ value }) => setP(value));
    return () => v.removeListener(id);
  }, [v]);
  useEffect(() => {
    Animated.timing(v, {
      toValue: progress,
      duration: 1300,
      useNativeDriver: false,
    }).start();
  }, [progress, v]);
  const { x, y } = routePosition(route, p, reverse ? "evening" : "morning");
  return (
    <View
      style={{
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#E9F0EC",
      }}
    >
      <Svg
        width="100%"
        height={260}
        viewBox={zoom ? "65 45 240 185" : "0 0 360 270"}
      >
        <Rect width="360" height="270" fill="#ECF2EE" />
        {[10, 70, 130, 190, 250, 310].map((n) => (
          <React.Fragment key={n}>
            <Path
              d={`M ${n} 0 L ${n + 90} 270`}
              stroke="#DDE7DF"
              strokeWidth={20}
            />
            <Path
              d={`M 0 ${n} L 360 ${n - 90}`}
              stroke="#FFF"
              strokeWidth={9}
            />
          </React.Fragment>
        ))}
        <Path
          d="M 280 270 Q 250 170 350 120"
          fill="none"
          stroke="#C9E4EA"
          strokeWidth={30}
        />
        <SvgText x={18} y={30} fill="#8BA595" fontSize={10} fontWeight="bold">
          GREATER ACCRA
        </SvgText>
        <Path
          d={points
            .map((stop, i) => `${i ? "L" : "M"} ${stop.x} ${stop.y}`)
            .join(" ")}
          fill="none"
          stroke="#FFF"
          strokeWidth={12}
          strokeLinejoin="round"
        />
        <Path
          d={points
            .map((stop, i) => `${i ? "L" : "M"} ${stop.x} ${stop.y}`)
            .join(" ")}
          fill="none"
          stroke={route.color}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        {points.map((stop, i) => (
          <React.Fragment key={stop.id}>
            <Circle
              onPress={() => setSelected(stop.name)}
              cx={stop.x}
              cy={stop.y}
              r={8}
              fill="white"
              stroke={route.color}
              strokeWidth={3}
            />
            <SvgText
              x={stop.x}
              y={stop.y + 23}
              fontSize={8}
              fill={C.navy}
              textAnchor="middle"
            >
              {i === points.length - 1
                ? "Destination"
                : stop.name.split(" ")[0]}
            </SvgText>
          </React.Fragment>
        ))}
        <Circle cx={x} cy={y} r={23} fill="#10B98133" />
        <Circle
          cx={x}
          cy={y}
          r={15}
          fill={C.navy}
          stroke="white"
          strokeWidth={3}
        />
        <SvgText x={x} y={y + 4} textAnchor="middle" fill="white" fontSize={11}>
          ▣
        </SvgText>
      </Svg>
      <View style={{ position: "absolute", right: 12, top: 12, gap: 8 }}>
        <Pressable
          accessibilityLabel="Toggle map zoom"
          accessibilityRole="button"
          onPress={() => setZoom(!zoom)}
          style={{ padding: 10, borderRadius: 12, backgroundColor: "white" }}
        >
          <Icon name={zoom ? "remove" : "add"} size={18} />
        </Pressable>
      </View>
      <View
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          backgroundColor: "white",
          borderRadius: 9,
          padding: 8,
        }}
      >
        <Text style={{ fontSize: 12, color: C.darkGreen, fontWeight: "700" }}>
          ● {selected || "SIMULATED LIVE LOCATION"}
        </Text>
      </View>
    </View>
  );
}

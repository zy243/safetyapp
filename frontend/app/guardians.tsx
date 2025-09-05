import React, { useContext } from "react";
import { View, Text, Button } from "react-native";
import { GuardianContext } from "../contexts/GuardianContext";

export default function GuardiansScreen() {
    const { guardians, addGuardian } = useContext(GuardianContext);

    return (
        <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>Guardian List:</Text>

            {guardians.length === 0 ? (
                <Text>No guardians added yet.</Text>
            ) : (
                guardians.map((g, i) => (
                    <Text key={i}>{g.name} - {g.phone}</Text>
                ))
            )}

            <Button
                title="Add Guardian"
                onPress={() => addGuardian({ name: "Mum", phone: "0123456789" })}
            />
        </View>
    );
}

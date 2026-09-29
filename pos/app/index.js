import { View, StyleSheet } from "react-native";
import CalculatorPane from "../src/components/CalculatorPane";
import CartPanel from "../src/components/CartPanel";

export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.calculator}>
        <CalculatorPane onAddToCart={() => {}} />
      </View>

      <View style={styles.cart}>
        <CartPanel
          cartItems={[]}
          selectedCustomer={null}
          onSelectCustomer={() => {}}
          onIncrement={() => {}}
          onDecrement={() => {}}
          onRemove={() => {}}
          onManageCart={() => {}}
          onHold={() => {}}
          onClear={() => {}}
          onCheckout={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },

  calculator: {
    flex: 1,
  },

  cart: {
    width: 420,
  },
});
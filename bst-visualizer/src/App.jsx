import { useState, useRef, useEffect } from "react";
import {
  Button,
  Card,
  Container,
  Form,
  Row,
  Col,
  Alert,
  ListGroup,
} from "react-bootstrap";
import * as d3 from "d3";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

function App() {
  const [tree, setTree] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [traversalResult, setTraversalResult] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [deleteValue, setDeleteValue] = useState('');
  const [speed, setSpeed] = useState(1000);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [history, setHistory] = useState([]);
  const svgRef = useRef(null);

  class Node {
    constructor(value) {
      this.value = value;
      this.left = null;
      this.right = null;
      this.highlight = false;
      // Add these for D3 compatibility
      this.children = [];
      this.x = 0;
      this.y = 0;
    }
  }

  // Insert into BST
  const insert = (value) => {
    try {
      const num = parseInt(value);
      if (isNaN(num)) throw new Error("Please enter a valid number");

      setStatus(`Inserting ${num}...`);
      setError("");

      const newNode = new Node(num);

      if (!tree) {
        setTree(newNode);
        addToHistory("Insert", num, true);
      } else {
        // Clone the tree to avoid direct state mutation
        const newTree = JSON.parse(JSON.stringify(tree));
        let current = newTree;
        let path = [current.value];
        let inserted = false;

        while (!inserted) {
          if (num < current.value) {
            if (!current.left) {
              current.left = newNode;
              path.push(num);
              inserted = true;
            } else {
              current = current.left;
              path.push(current.value);
            }
          } else if (num > current.value) {
            if (!current.right) {
              current.right = newNode;
              path.push(num);
              inserted = true;
            } else {
              current = current.right;
              path.push(current.value);
            }
          } else {
            throw new Error("Value already exists in tree");
          }
        }

        setTree(newTree);
        addToHistory("Insert", path, true);
      }

      setStatus(`Successfully inserted ${num}`);
      setInputValue("");
    } catch (err) {
      setError(err.message);
      setStatus("Insert failed");
    }
  };
  const cloneNode = (node) => {
    if (!node) return null;
    const newNode = new Node(node.value);
    newNode.left = cloneNode(node.left);
    newNode.right = cloneNode(node.right);
    return newNode;
  };
  // Delete from BST
  const deleteNode = (value) => {
    try {
      // Check if input is empty
      if (value === '') throw new Error('Please enter a value to delete');
      
      const num = Number(value);
      if (isNaN(num)) throw new Error('Please enter a valid number');
      if (!tree) throw new Error('Tree is empty');
  
      setStatus(`Deleting ${num}...`);
      setError('');
  
      const findMin = (node) => {
        while (node.left) {
          node = node.left;
        }
        return node;
      };
  
      const deleteRec = (node, value) => {
        if (!node) return null;
  
        if (value < node.value) {
          node.left = deleteRec(node.left, value);
        } else if (value > node.value) {
          node.right = deleteRec(node.right, value);
        } else {
          // Node found
          if (!node.left && !node.right) {
            return null;
          } else if (!node.left) {
            return node.right;
          } else if (!node.right) {
            return node.left;
          } else {
            const minRight = findMin(node.right);
            node.value = minRight.value;
            node.right = deleteRec(node.right, minRight.value);
          }
        }
        return node;
      };
  
      // Create a deep copy of the tree for immutability
      const newTree = JSON.parse(JSON.stringify(tree));
      const result = deleteRec(newTree, num);
  
      if (result === null) {
        setTree(null); // Tree is now empty
      } else {
        setTree(result);
      }
  
      setStatus(`Successfully deleted ${num}`);
      setDeleteValue(''); // Clear the delete input field
      addToHistory('Delete', num, true);
      visualizeTree();
    } catch (err) {
      setError(err.message);
      setStatus('Delete failed');
    }
  };

  // Traversal methods
  const traverse = async (type) => {
    if (!tree) {
      setError("Tree is empty");
      return;
    }

    setIsVisualizing(true);
    setStatus(`Performing ${type} traversal...`);
    setTraversalResult([]);

    const result = [];
    const nodes = [];

    const traverseFunctions = {
      "pre-order": async (node) => {
        if (node) {
          node.highlight = true;
          setTree({ ...tree });
          result.push(node.value);
          nodes.push(node);
          await new Promise((resolve) => setTimeout(resolve, speed));
          await traverseFunctions["pre-order"](node.left);
          await traverseFunctions["pre-order"](node.right);
          node.highlight = false;
          setTree({ ...tree });
        }
      },
      "in-order": async (node) => {
        if (node) {
          await traverseFunctions["in-order"](node.left);
          node.highlight = true;
          setTree({ ...tree });
          result.push(node.value);
          nodes.push(node);
          await new Promise((resolve) => setTimeout(resolve, speed));
          await traverseFunctions["in-order"](node.right);
          node.highlight = false;
          setTree({ ...tree });
        }
      },
      "post-order": async (node) => {
        if (node) {
          await traverseFunctions["post-order"](node.left);
          await traverseFunctions["post-order"](node.right);
          node.highlight = true;
          setTree({ ...tree });
          result.push(node.value);
          nodes.push(node);
          await new Promise((resolve) => setTimeout(resolve, speed));
          node.highlight = false;
          setTree({ ...tree });
        }
      },
    };

    await traverseFunctions[type](tree);
    setTraversalResult(result);
    setStatus(`Completed ${type} traversal`);
    setIsVisualizing(false);
    addToHistory("Traversal", type);
  };

  // Level order traversal
  const levelOrder = async () => {
    if (!tree) {
      setError("Tree is empty");
      return;
    }

    setIsVisualizing(true);
    setStatus("Performing level-order traversal...");
    setTraversalResult([]);

    const result = [];
    const queue = [tree];
    const nodes = [];

    while (queue.length > 0) {
      const levelSize = queue.length;
      const currentLevel = [];

      for (let i = 0; i < levelSize; i++) {
        const currentNode = queue.shift();
        currentNode.highlight = true;
        setTree({ ...tree });
        currentLevel.push(currentNode.value);
        nodes.push(currentNode);
        result.push(currentNode.value);
        await new Promise((resolve) => setTimeout(resolve, speed));

        if (currentNode.left) queue.push(currentNode.left);
        if (currentNode.right) queue.push(currentNode.right);

        // Reset highlight after processing children
        currentNode.highlight = false;
        setTree({ ...tree });
      }
    }

    setTraversalResult(result);
    setStatus("Completed level-order traversal");
    setIsVisualizing(false);
    addToHistory("Traversal", "Level-order");
  };

  // Add operation to history
  const addToHistory = (operation, value, success = true) => {
    setHistory((prev) => [
      ...prev,
      {
        operation,
        value,
        timestamp: new Date().toLocaleTimeString(),
        success,
      },
    ]);
  };

  // Clear the tree
  const clearTree = () => {
    setTree(null);
    setTraversalResult([]);
    setStatus("Tree cleared");
    addToHistory("Clear", "All nodes");
  };

  // Visualize tree using D3.js
  const visualizeTree = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
  
    if (!tree) return;
  
    const width = 800;
    const height = 400;
    svg.attr('width', width).attr('height', height);
  
    // Convert our BST to a D3 hierarchy
    const root = d3.hierarchy(tree, d => {
      const children = [];
      if (d.left) children.push(d.left);
      if (d.right) children.push(d.right);
      return children.length ? children : null;
    });
  
    // Create tree layout
    const treeLayout = d3.tree().size([width - 100, height - 100]);
    treeLayout(root);
  
    // Draw links (edges)
    svg.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical()
        .x(d => d.x + 50)
        .y(d => d.y + 50));
  
    // Draw nodes
    const nodes = svg.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x + 50},${d.y + 50})`);
  
    nodes.append('circle')
      .attr('r', 20)
      .attr('class', d => d.data.highlight ? 'node-highlight' : 'node-normal');
  
    nodes.append('text')
      .attr('dy', '.31em')
      .attr('text-anchor', 'middle')
      .text(d => d.data.value);
  };
  // Update visualization when tree changes

  useEffect(() => {
    const handleResize = () => {
      visualizeTree();
    };
  
    window.addEventListener('resize', handleResize);
    visualizeTree(); // Initial render
  
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [tree, traversalResult]);

  return (
  <Container className="mt-4">
    <h1 className="text-center mb-4">Binary Search Tree Visualizer</h1>

    <Row>
      <Col md={3}>
        <Card className="mb-4">
          <Card.Header as="h5">Controls</Card.Header>
          <Card.Body>
            <Form.Group className="mb-3">
              <Form.Label>Insert Value</Form.Label>
              <div className="d-flex">
                <Form.Control
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter a number"
                  disabled={isVisualizing}
                />
                <Button
                  variant="primary"
                  className="ms-2"
                  onClick={() => insert(inputValue)}
                  disabled={isVisualizing}
                >
                  Insert
                </Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Delete Value</Form.Label>
              <div className="d-flex">
                <Form.Control
                 type="number"
                 value={deleteValue}
                 onChange={(e) => setDeleteValue(e.target.value)}
                 placeholder="Enter a number"
                 disabled={isVisualizing}
                />
                <Button
                  variant="danger"
                  className="ms-2"
                  onClick={() => deleteNode(deleteValue)}
                  disabled={isVisualizing}
                >
                  Delete
                </Button>
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Speed (ms)</Form.Label>
              <Form.Range
                min="100"
                max="2000"
                step="100"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
              />
              <div className="text-center">{speed} ms</div>
            </Form.Group>

            <Button
              variant="warning"
              className="w-100 mb-3"
              onClick={clearTree}
              disabled={isVisualizing}
            >
              Clear Tree
            </Button>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Header as="h5">Traversals</Card.Header>
          <Card.Body>
            <div className="d-grid gap-2">
              <Button
                variant="outline-primary"
                onClick={() => traverse("pre-order")}
                disabled={isVisualizing}
              >
                Pre-order
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => traverse("in-order")}
                disabled={isVisualizing}
              >
                In-order
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => traverse("post-order")}
                disabled={isVisualizing}
              >
                Post-order
              </Button>
              <Button
                variant="outline-primary"
                onClick={levelOrder}
                disabled={isVisualizing}
              >
                Level-order
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6}>
        {/* Responsive Tree Visualization Area */}
        <div className="tree-container mb-3">
          <svg 
            ref={svgRef} 
            className="tree-svg"
            viewBox="0 0 800 400" 
            preserveAspectRatio="xMidYMid meet"
          ></svg>
        </div>

        <Card className="mb-3">
          <Card.Header as="h5">Traversal Result</Card.Header>
          <Card.Body>
            {traversalResult.length > 0 ? (
              <div className="d-flex flex-wrap gap-2">
                {traversalResult.map((val, index) => (
                  <span key={index} className="badge bg-primary">
                    {val}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted">No traversal performed yet</p>
            )}
          </Card.Body>
        </Card>
      </Col>

      <Col md={3}>
        <Card className="mb-4">
          <Card.Header as="h5">Tree Info</Card.Header>
          <Card.Body>
            <div className="mb-3">
              <strong>Root:</strong> {tree ? tree.value : "NULL"}
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <div className="mb-3">
              <strong>Status:</strong> {status}
            </div>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header as="h5">Operation History</Card.Header>
          <Card.Body className="history-container">
            <ListGroup variant="flush">
              {history.length > 0 ? (
                history.map((item, index) => (
                  <ListGroup.Item
                    key={index}
                    className={item.success ? "text-success" : "text-danger"}
                  >
                    [{item.timestamp}] {item.operation}:{" "}
                    {typeof item.value === "object"
                      ? item.value.join(" → ")
                      : item.value}
                  </ListGroup.Item>
                ))
              ) : (
                <p className="text-muted">No history yet</p>
              )}
            </ListGroup>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Container>
);
}

export default App;
